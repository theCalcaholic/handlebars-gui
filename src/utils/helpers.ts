import { createGlobalState, useDark } from "@vueuse/core";
import Handlebars from "handlebars";
import { marked } from "marked";

export const parseMarkdown = (payload: string) => {
  return marked.parse(payload, { gfm: true, breaks: false })

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
            ${parsedHtml}
        </body>
    </html`
}

export const useDarkGlobal = createGlobalState(() => useDark())

export const initialEditorValue = {
  html: '<div id="app" class="min-h-screen bg-gray-300 dark:bg-gray-600 py-6 flex flex-col sm:py-12 space-y-4">\n    <div v-for="(post, index) in posts" :key="index" class="max-w-2xl px-8 py-4 mx-auto bg-white rounded-lg shadow-md dark:bg-gray-800">\n        <div class="flex items-center justify-between">\n            <span class="text-sm font-light text-gray-600 dark:text-gray-400">Mar 10, 2019</span>\n            <a class="px-3 py-1 text-sm font-bold text-gray-100 transition-colors duration-200 transform bg-gray-600 rounded cursor-pointer hover:bg-gray-500">Design</a>\n        </div>\n\n        <div class="mt-2">\n            <a href="#" class="text-2xl font-bold text-gray-700 dark:text-white hover:text-gray-600 dark:hover:text-gray-200 hover:underline text-capitalize" v-text="post.title"></a>\n            <p class="mt-2 text-gray-600 dark:text-gray-300" v-text="post.body"></p>\n        </div>\n        \n        <div class="flex items-center justify-between mt-4">\n            <a href="#" class="text-blue-600 dark:text-blue-400 hover:underline">Read more</a>\n\n            <div class="flex items-center">\n                <img class="hidden object-cover w-10 h-10 mx-4 rounded-full sm:block" :src="post.avatar" alt="avatar">\n                <a class="font-bold text-gray-700 cursor-pointer dark:text-gray-200" v-text="post.name"></a>\n            </div>\n        </div>\n    </div>\n</div>',
  javascript: 'import { setup as twindSetup } from \'https://cdn.skypack.dev/twind/shim\'\nimport { \n    createApp, \n    ref \n} from \'https://esm.sh/vue@3.2.37/dist/vue.esm-browser.js\'\nimport { faker } from \'https://cdn.skypack.dev/@faker-js/faker\'\n  \n\ntwindSetup({\n    darkMode: \'class\'\n})\n\nconst generateFakePosts = (count) => {\n    return [...Array(count).keys()].map(() => ({\n        name: faker.name.fullName(),\n        avatar: faker.image.avatar(),\n        cover: faker.image.image().replace(\'http\', \'https\'),\n        title: faker.lorem.words(5),\n        body: faker.lorem.sentences(5)\n    }))\n}\n\ncreateApp({\n  data() {\n    return {\n      posts: generateFakePosts(10)\n    }\n  }\n}).mount(\'#app\')',
  css: '',
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
