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
import GenericDialog from "../components/GenericDialog.vue";

const iframe = ref<HTMLIFrameElement>()
const items = ref([
    { text: 'HTML', value: 'html' },
    // TODO: Implement inlining of css
    { text: 'CSS', value: 'css' },
    //{ text: 'JS', value: 'javascript' },
    { text: 'Content', value: 'markdown' }
])

const sessions = useStorage(StorageName.LOCAL_SESSIONS, [{id: window.crypto.randomUUID()}])
const activeSession = useStorage(StorageName.ACTIVE_SESSION, sessions.value[0].id)

let editorValue: RemovableRef<Record<string,  any>>
let currentTab: RemovableRef<string>

const loadSession = (sessId: string): [RemovableRef<Record<string, any>>, RemovableRef<string>] => {
    if (sessions.value.findIndex(sess => sess.id == sessId) === -1) {
        sessions.value.push({id: sessId})
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
    let compressed = window.location.hash.substring(1)
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
    editorValue.value = {
        html: loadedEditorValue?.['html']?.toString() ?? '',
        css: loadedEditorValue?.['css']?.toString() ?? '',
        javascript: loadedEditorValue?.['javascript']?.toString() ?? '',
        markdown: loadedEditorValue?.['markdown']?.toString() ?? '',
    }

    window.location.hash = ""
    console.log("Loaded from url: ", loadedEditorValue)

} catch (e) {
    console.debug("Could not load from URL: ", e)
}

const config = useStorage(
  StorageName.CONFIG,
  { bodyOnly: true, iframeBgColor: '#c9c5bb', editorWordWrap: true },
)
const isDark = useDarkGlobal()
const showDeleteActiveSessionDialog = ref(false)

watch(isDark, (value) => {
    iframe.value?.contentWindow?.postMessage(
      `theme-${value ? 'dark' : 'light'}`,
      '*',
    )
})
const updateIframe = (payload: Record<string, any>) => {
    iframe.value!.srcdoc = generateHTML(payload, isDark.value)
}

watch(activeSession, (sessId) => {
    [editorValue, currentTab] = loadSession(sessId)
    updateIframe(editorValue.value)
})

const onChange = (payload: Record<string, any>) => {
    editorValue!.value.html = payload.html
    editorValue!.value.javascript = payload.javascript
    editorValue!.value.css = payload.css
    editorValue!.value.markdown = payload.markdown
    updateIframe(payload)
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
    const deleteSessIndex = sessions.value.findIndex(session => session.id === deleteSessId)
    if (sessions.value.length == 1) {
        createSession()
    } else if (deleteSessIndex == 0) {
        activeSession.value = sessions.value[sessions.value.length - 1].id
    } else {
        activeSession.value = sessions.value[deleteSessIndex - 1].id
    }
    sessions.value.splice(deleteSessIndex, 1)
    const storageNames = [StorageName.ACTIVE_TAB, StorageName.EDITOR_VALUE, StorageName.EDITOR_STATE]
    storageNames.forEach(storageName => {
        useStorage(`${deleteSessId}-${storageName}`, null).value = null
    })
}

const handleSessionDeletionChoice = (choice: string) => {
    showDeleteActiveSessionDialog.value = false
    if (choice == 'Yes') {
        deleteActiveSession()
    }
}

</script>

<template>
    <main class="main-container border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-row h-full">
            <div id="split-0" class="w-full">
                <Tabs v-model="currentTab" :items="items" />
                <MonacoEditor v-if="editorValue" :session-id="activeSession" :active-tab="currentTab" :editor-word-wrap="config['editorWordWrap'] ? 'on' : 'off'" :editor-value="editorValue" @change="onChange" />
            </div>
            <iframe
              ref="iframe"
              class="h-full w-full"
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups allow-top-navigation-by-user-activation allow-downloads"
              frameBorder="0"
              :style="`background-color: ${config['iframeBgColor']};`"
            />
        </div>
        <div class="settings-pane">
            <div class="settings-container">
                <h3>Share</h3>
                <div class="setting"></div>
                <button @click="copyShareLink()">Copy Share Link</button>
            </div>
            <div class="settings-container">
                <h3>Download</h3>
                <div class="setting">
                    <input type="checkbox" name="download-body-only" v-model="config['bodyOnly']" />
                    <label for="download-body-only">HTML body only</label>
                </div>
                <div class="setting"></div>
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

                <div class="setting">
                <div></div><div>Background Color:</div>
                </div>
                <div class="setting">
                    <div></div><input type="color" v-model="config['iframeBgColor']">
                </div>
            </div>
            <div class="settings-container">
                <h3>Projects</h3>
                <div class="setting">
                    <button class="icon-button button-red" @click="showDeleteActiveSessionDialog = true"><i class="fa fa-trash"></i></button>
                    <select v-model="activeSession">
                        <option v-for="session in sessions" :key="session"
                                :value="session.id"
                                :selected="session.id === activeSession">
                            {{ session.id.slice(0, 6) }}
                        </option>
                    </select>
                </div>
                <div class="setting">
                    <button class="button" style="flex-grow: 1" @click="createSession()">new project</button>
                </div>
            </div>
            <div class="flex-spacer"></div>
            <div class="settings-container">
                <h3>Info</h3>
                <div class="setting">
                    <a class="gh-link" href="https://github.com/theCalcaholic/stencil">
                        <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" class="octicon octicon-mark-github v-align-middle">
                            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                        </svg>
                        Source Code
                    </a>
                </div>
                <div class="setting">
                    <a class="text-align-right smaller-text" href="https://github.com/theCalcaholic/stencil/blob/main/LICENSE.md"> GNU GENERAL PUBLIC LICENSE<br/>Version 3, 29 June 2007</a>
                </div>
            </div>
        </div>
        <GenericDialog v-if="showDeleteActiveSessionDialog" @choice="handleSessionDeletionChoice" text="Delete active project?" :choices="['Yes', 'No']"/>
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
.settings-pane {
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
    margin: .6em 10px .2em;
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
}
.setting a {
    align-items: center;
    display: flex;
    width: 100%;
    justify-content: flex-end;
}
a.gh-link {
    padding: 4px 0;
}
.settings-pane>* {
    margin-bottom: 2em;
}
.main-container {
    display: flex;
}
.flex-spacer {
    flex-grow: 1;
}
.smaller-text {
    font-size: .7em;
}

.icon-button {
    background-color: transparent; /* Blue background */
    border: none; /* Remove borders */
    color: var(--color-highlight);
    padding: 4px 12px; /* Some padding */
    font-size: 16px; /* Set a font size */
    cursor: pointer; /* Mouse pointer on hover */
    flex-grow: 0;
    flex-shrink: 0;
}

.button-red {
    color: var(--color-highlight-danger); /* White text */
}
button {
    transition:
      background-color .4s ease,
      outline-color .4s ease;
    outline: transparent solid 1px;
}

.text-align-right {
    text-align: right;
}

.octicon {
    fill: currentColor;
    margin-right: .5em;
}

/* Darker background on mouse-over */
button:hover {
    background-color: var(--color-highlight-background);
    outline: var(--color-highlight) solid 1px;
}

button, input[type=color], select {
    background-color: var(--color-contrast-background);
    color: var(--color-highlight);
    border-width: 0;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
}

div.spacer {
    display: block;
    flex-grow: 0;
}
</style>
