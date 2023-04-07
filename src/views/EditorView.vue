<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import Split from 'split.js'
import {
    StorageName,
    generateHTML,
    useDarkGlobal,
    restoreLinks,
    //minifyHTML,
    generateHTMLBody,
    initialEditorValue
} from "../utils";
import MonacoEditor from '../components/MonacoEditor.vue'
import Tabs from '../components/Tabs.vue'
const iframe = ref<HTMLIFrameElement>()
const items = ref([
    { text: 'HTML', value: 'html' },
    // TODO: Implement inlining of css
    { text: 'CSS', value: 'css' },
    //{ text: 'JS', value: 'javascript' },
    { text: 'Content', value: 'markdown' }
])

const currentTab = useStorage(StorageName.ACTIVE_TAB, items.value[0].value)
const editorValue = useStorage<Record<string, any>>(
  StorageName.EDITOR_VALUE,
  initialEditorValue,
)
const config = useStorage(
  StorageName.CONFIG,
  { bodyOnly: true, iframeBgColor: '#c9c5bb', editorWordWrap: true },
)
const isDark = useDarkGlobal()
watch(isDark, (value) => {
    iframe.value?.contentWindow?.postMessage(
      `theme-${value ? 'dark' : 'light'}`,
      '*',
    )
})
const onChange = (payload: Record<string, any>) => {
    editorValue.value.html = payload.html
    editorValue.value.javascript = payload.javascript
    editorValue.value.css = payload.css
    editorValue.value.markdown = payload.markdown
    iframe.value!.srcdoc = generateHTML(payload, isDark.value)
}
onMounted(() => {
    Split(['#split-0', 'iframe'])
})

const download = (payload: String) => {
    const blob = new Blob([payload], {type: 'text'})
    const elem = document.createElement('a')
    elem.href = URL.createObjectURL(blob)
    elem.download = 'merged.html'
    document.body.appendChild(elem)
    elem.click()
    document.body.removeChild(elem)
}

const downloadMerged = () => {
    download(restoreLinks(config.value.bodyOnly
      ? generateHTMLBody(editorValue.value, true)
      : generateHTML(editorValue.value, isDark.value)))
}
</script>

<template>
    <main class="main-container border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-row h-full">
            <div id="split-0" class="w-full">
                <Tabs v-model="currentTab" :items="items" />
                <MonacoEditor :active-tab="currentTab" :editor-word-wrap="config['editorWordWrap'] ? 'on' : 'off'" :editor-value="editorValue" @change="onChange" />
            </div>
            <iframe
              ref="iframe"
              class="h-full w-full"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups allow-top-navigation-by-user-activation allow-downloads"
              frameBorder="0"
              :style="`background-color: ${config['iframeBgColor']};`"
            />
        </div>
        <div class="buttons">
            <div class="settings-container">
                <h3>Download</h3>
                <div class="setting">
                    <input type="checkbox" name="download-body-only" v-model="config['bodyOnly']" />
                    <label for="download-body-only">HTML body only</label>
                </div>
                <button @click="downloadMerged()">Download HTML</button>
            </div>
            <div class="settings-container">
                <h3>Editor</h3>
                <div class="setting">
                    <input type="checkbox" name="editor-wordwrap" v-model="config['editorWordWrap']" />
                    <label for="editor-wordwrap">wrap lines</label>
                </div>
            </div>
            <div class="settings-container">
                <h3>Preview</h3>
                Background Color:
                <input type="color" v-model="config['iframeBgColor']">
            </div>
        </div>
    </main>
</template>

<style>
main {
    height: calc(100vh - var(--nav-height));
    flex-grow: 2;
    display: flex;
    justify-content: flex-start;
}
.gutter {
    @apply dark:bg-gray-900 bg-no-repeat;
    background-position: 50%;
}
.gutter.gutter-horizontal {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    cursor: col-resize;
}

.h-full {
    flex-grow: 1;
}
.buttons {
    display: flex;
    right: 0;
    width: 180px;
    flex-grow: 0;
    flex-shrink: 0;
    flex-direction: column;
    justify-content: flex-start;
    align-items: end;
}
.settings-container {
    display: block;
    text-align: right;
    white-space: nowrap;
    border-top-width: 1px;
    border-top-style: solid;
    width: 100%;
}
.settings-container input {
    display: block;
    float: right;
}
.settings-container .setting {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: .2em 10px;
}
.setting>label {
    margin-left: 1em;
}
.setting>input {
    flex-grow: 0;
}
.buttons>* {
    margin-bottom: 2em;
}
.main-container {
    display: flex;
}
</style>
