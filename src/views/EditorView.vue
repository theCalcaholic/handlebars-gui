<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { RemovableRef, useStorage } from "@vueuse/core";
import Split from "split.js";
import {
    copyToClipboard,
    generateHTML,
    generateHTMLBody,
    initialEditorValue,
    restoreLinks,
    StorageName,
    useDarkGlobal
} from "../utils";
import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate";
import MonacoEditor from "../components/MonacoEditor.vue";
import Tabs from "../components/Tabs.vue";

const iframe = ref<HTMLIFrameElement>()
const items = ref([
    { text: 'HTML', value: 'html' },
    // TODO: Implement inlining of css
    { text: 'CSS', value: 'css' },
    //{ text: 'JS', value: 'javascript' },
    { text: 'Content', value: 'markdown' }
])

let compressed = window.location.hash.substring(1)
console.log("isSecureContext?", window.isSecureContext)
const sessions = useStorage(StorageName.LOCAL_SESSIONS, [window.crypto.randomUUID()])
const activeSession = useStorage(StorageName.ACTIVE_SESSION, sessions.value[0])

let editorValue: RemovableRef<Record<string,  any>>
let currentTab: RemovableRef<string>

const loadSession = (sessId: string): [RemovableRef<Record<string, any>>, RemovableRef<string>] => {
    if (sessions.value.indexOf(sessId) === -1) {
        sessions.value.push(sessId)
    }
    return [
      useStorage<Record<string, any>>(`${sessId}-${StorageName.EDITOR_VALUE}`, initialEditorValue),
        useStorage(`${sessId}-${StorageName.ACTIVE_TAB}`, items.value[0].value)]
}
const createSession = () => {
    activeSession.value = window.crypto.randomUUID()
}
[editorValue, currentTab] = loadSession(activeSession.value)

try {
    let loadedEditorValue: null | Record<string, any> = null
    if (compressed.length <= 1) {
        throw new Error("No data in URL")
    }

    loadedEditorValue = JSON.parse(
      strFromU8(
        unzlibSync(new Uint8Array(
          Array.from(window.atob(compressed))
            .map(ch => ch.charCodeAt(0))))))

    createSession();
    [editorValue, currentTab] = loadSession(activeSession.value)
    editorValue.value = loadedEditorValue

    console.log("Loaded from url: ", loadedEditorValue)

} catch (e) {
    console.debug("Could not load from URL: ", e)
}

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

watch(activeSession, (sessId) => {
    [editorValue, currentTab] = loadSession(sessId)
})

const onChange = (payload: Record<string, any>) => {
    editorValue!.value.html = payload.html
    editorValue!.value.javascript = payload.javascript
    editorValue!.value.css = payload.css
    editorValue!.value.markdown = payload.markdown
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
      ? generateHTMLBody(editorValue!.value, true)
      : generateHTML(editorValue!.value, isDark.value)))
}

const copyShareLink = () => {
    let compressed = window.btoa(Array.from(zlibSync(strToU8(JSON.stringify(editorValue!.value))))
      .map(byte => String.fromCharCode(byte)).join(''))
    console.log(`compressed: ${compressed}`)
    let shareLink = window.location.protocol + '//' + window.location.host + window.location.pathname
      + `#${compressed}`
    console.log(`share link: ${shareLink}`)
    copyToClipboard(shareLink)
}

const deleteActiveSession = () => {
    const deleteSessId = activeSession.value
    const deleteSessIndex = sessions.value.indexOf(deleteSessId)
    if (sessions.value.length == 1) {
        createSession()
    } else if (deleteSessIndex == sessions.value.length - 1) {
        activeSession.value = sessions.value[0]
    } else {
        activeSession.value = sessions.value[deleteSessIndex + 1]
    }
    sessions.value.splice(sessions.value.indexOf(deleteSessId), 1)
    const storageNames = [StorageName.ACTIVE_TAB, StorageName.EDITOR_VALUE, StorageName.EDITOR_STATE]
    storageNames.forEach(storageName => {
        useStorage(`${deleteSessId}-${storageName}`, null).value = null
    })
}
</script>

<template>
    <main class="main-container border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-row h-full">
            <div id="split-0" class="w-full">
                <Tabs v-model="currentTab" :items="items" />
                <MonacoEditor v-if="editorValue" :active-tab="currentTab" :editor-word-wrap="config['editorWordWrap'] ? 'on' : 'off'" :editor-value="editorValue" @change="onChange" />
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
                <h3>Share</h3>
                <button @click="copyShareLink()">Copy Share Link</button>
            </div>
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
            <div class="settings-container">
                <h3>Sessions</h3>
                <div class="setting">
                    <select v-model="activeSession">
                        <option v-for="(session, index) in sessions" :key="session"
                                :value="session"
                                :selected="session == activeSession">
                            Session {{ session.slice(0, 6) }}
                        </option>
                    </select>
                    <button class="icon-button" @click="deleteActiveSession()"><i class="fa fa-trash"></i></button>
                </div>
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
    align-items: baseline;
}
.setting>label {
    margin-left: 1em;
}
.setting>input {
    flex-grow: 0;
}
.setting>select {
    flex-grow: 1;
    margin-right: 4px;
}
.buttons>* {
    margin-bottom: 2em;
}
.main-container {
    display: flex;
}

.icon-button {
    background-color: transparent; /* Blue background */
    border: none; /* Remove borders */
    color: hsla(20, 100%, 37%, 1); /* White text */
    padding: 12px 16px; /* Some padding */
    font-size: 16px; /* Set a font size */
    cursor: pointer; /* Mouse pointer on hover */
    flex-grow: 0;
    flex-shrink: 0;
}

/* Darker background on mouse-over */
.icon-button:hover {
    background-color: hsla(160, 100%, 37%, 0.2);
}
</style>
