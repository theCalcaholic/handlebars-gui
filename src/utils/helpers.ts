import { createGlobalState, useDark } from "@vueuse/core";
import Handlebars from "handlebars";
import { marked } from "marked";

export const parseMarkdown = (payload: string) => {
  let parsed = marked.parse(payload.trim(), { gfm: false, breaks: false })
  if (parsed.indexOf('<p>') === 0) {
    parsed = parsed.substring(3, parsed.length - 5)
  }
  return parsed

}

const parseContent = (markdown: string) => {
  const fieldTitleRe = /^\s*===(\w+)===\s*$/m
  let fields = extractFields(markdown, fieldTitleRe)

  fields = fields.filter(f => {
    if (f[0] === null) {
      console.log("No root content allowed!")
      return false
    }
    return true
  })
  return Object.fromEntries(fields)
}

const extractFields = (markdown: string, separator: RegExp, compileMd = true): Array<[null|string, Array<any>]> => {
  console.log(`extractFields('${markdown}', '${separator}')`)

  const fields: Array<[string|null, Array<any>]> = []
  const fieldTitleMatches: RegExpMatchArray[] = []
  if (!markdown) {
    return []
  }
  let searchString = markdown
  let fieldTitleMatch = searchString.match(separator)

  if (fieldTitleMatch === null) {
    return Array.of([null, Array.of(markdown)])
  }

  while (fieldTitleMatch !== null) {
    fieldTitleMatches.push(fieldTitleMatch)
    searchString = searchString.substring((fieldTitleMatch.index ?? 0) + fieldTitleMatch[0].length)
    fieldTitleMatch =  searchString.match(separator)
  }

  let offset = 0
  for (let i = 0; i < fieldTitleMatches.length; i++) {
    let fieldTitle = null
    if (fieldTitleMatches[i].length > 1) {
      fieldTitle = fieldTitleMatches[i][1]
    }
    const startPos = offset + (fieldTitleMatches[i].index ?? 0) + fieldTitleMatches[i][0].length
    let fieldValue: string|Array<object> = markdown.substring(
      startPos,
      i == fieldTitleMatches.length - 1 ? undefined : startPos + fieldTitleMatches[i+1].index)
    offset += (fieldTitleMatches[i].index ?? 0) + fieldTitleMatches[i][0].length

    if ( fieldValue.match(/^\s*>---/m) !== null ) {

      fieldValue = Array.from(extractFields(fieldValue, /^\s*>---\s*$/m, false).values())
        .map(o => extractFields(o[1], /^\s*=(\w+)=\s*$/m))
        .filter(o => o[0] !== null)
        .map(o => Object.fromEntries(o));
      console.log("list fields: ", fieldValue)
    } else if(compileMd) {
      fieldValue = parseMarkdown(fieldValue)
    }

    fields.push([fieldTitle, fieldValue])
  }

  return fields
}

export const parseHandlebars = (templateString: string, markdown: string) => {
  const fields = parseContent(markdown)
  console.log('fields', fields)

  const template = Handlebars.compile(templateString)
  return template(fields)

}

export const generateHTML = (
  payload: Record<string, any>,
  isDark?: boolean,
) => {
  const parsedHtml = parseHandlebars(payload.html, payload.markdown)
  return `<html class="${isDark ? 'dark' : ''}">
        <head>
            <style id="_style">${payload.css}</style>
            <script type="module" id="_script">
                ${payload.javascript}

                window.addEventListener('message', function(event) {
                    console.log(event)
                    if (event.data === 'theme-dark') {
                        document.documentElement.classList.add('dark')
                    } else if (event.data === 'theme-light') {
                        document.documentElement.classList.remove('dark')
                    }
                })
            </script>
        </head>
        <body>
            ${replaceLinks(parsedHtml)}
        </body>
    </html`
}

const replaceLinks = (html: string) => {
  return html
    .replace(/href='#/g, "href='about:srcdoc#")
    .replace(/href="#/g, "href=\"about:srcdoc#")
}

export const restoreLinks = (html: string) => {
  return html
    .replace(/href='about:srcdoc#/g, "href='#")
    .replace(/href="about:srcdoc#/g, "href=\"#")
}

export const useDarkGlobal = createGlobalState(() => useDark())

export const initialEditorValue = {
  html: '<div>\n' +
    '  <h1>{{{ title }}}</h1>\n' +
    '  \n' +
    '  <p>{{{ text }}}</p>\n' +
    '  <h3>list title</h3>\n' +
    '  <ol>\n' +
    '  \n' +
    '  {{#each listItems}}\n' +
    '    <li>\n' +
    '      <label style="font-weight: bold;">Name: </label>\n' +
    '      {{{ this.name }}}\n' +
    '      <p>{{{ this.description }}}</p>\n' +
    '    </li>\n' +
    '  {{/each}}\n' +
    '  </ol>\n' +
    '</div>',
  javascript: '',
  css: '',
  markdown: '===title===\n' +
    '\n' +
    'Demonstration\n' +
    '\n' +
    '===text===\n' +
    '\n' +
    'This is the text, that will be mapped in the *text* field in the html template. \n' +
    '**It** supports *markdown* and even <b>inline</b> \n' +
    '<font style="text-transform: uppercase;">html</font>.\n' +
    'Normally, newlines are not visible in the final html, but if you\n' +
    '\n' +
    'leave an empty line, this will cause a line break.\n' +
    '\n' +
    '===listTitle===\n' +
    '\n' +
    'A list\n' +
    '\n' +
    '===listItems===\n' +
    '\n' +
    '>---\n' +
    '\n' +
    '=name=\n' +
    '\n' +
    'A list item\n' +
    '\n' +
    '=description=\n' +
    '\n' +
    'All list items will be generated from the same template. Individual items are separated by `>---` \n' +
    '(see above)\n' +
    '\n' +
    '>---\n' +
    '\n' +
    '=name=\n' +
    '\n' +
    'Another list item\n' +
    '\n' +
    '=description=\n' +
    '\n' +
    'Note, how the field names for list items use `=fieldName=` instead of `===fieldName===`.\n'
}

export const generateContentSections = (html: string) => {
  const ast = Handlebars.parseWithoutProcessing(html)
  const keys: Map<string, boolean> = new Map()
  let content = ""
  for (const i in ast.body) {
    const item = ast.body[i]
    if (item.type === 'MustacheStatement') {
      let section = item.path.original
      if (section.indexOf('.') !== -1 ) {
        section = section.substring(section.lastIndexOf('.'))
      }
      content += `===${section}===\n\n${section} value\n\n`
    } else if(item.type === 'BlockStatement' && item.path.parts[0] === 'each') {
      content += `===${item.params[0].parts[0]}===\n`
      const listBody = item.program.body
      if (listBody.length > 0) {
        content += `\n>---\n\n`
      }
      for(const j in listBody) {
        if (listBody[j].type === 'MustacheStatement') {
          let section = listBody[j].path.original.replace(/^this\./, '')
          content += `=${section}=\n\n${item.params[0].parts[0]} ${section} example\n\n`
        }
      }
      content += "\n"
    } else {
      console.log("Unrecognized statement type: ", ast.body[i].type, ast.body[i])
    }
  }

  return content
}
