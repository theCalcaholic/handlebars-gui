
Skip to content
Pull requests
Issues
Codespaces
Marketplace
Explore
@theCalcaholic
wobsoriano /
codeplayground
Public

Fork your own copy of wobsoriano/codeplayground

Code
Issues 1
Pull requests
Actions
Projects
Security

Insights

codeplayground/src/components/Main.vue
@wobsoriano
wobsoriano fix lint errors
Latest commit 8ea3813 Aug 28, 2022
History
1 contributor
69 lines (57 sloc) 1.67 KB
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import Split from 'split.js'
import { StorageName, generateHTML, useDarkGlobal } from '../utils'
import MonacoEditor from '../components/MonacoEditor.vue'
import Tabs from '../components/Tabs.vue'
const iframe = ref<HTMLIFrameElement>()
const items = ref([
    { text: 'HTML', value: 'html' },
    { text: 'CSS', value: 'css' },
    { text: 'JS', value: 'javascript' },
    { text: 'Content', value: 'markdown' }
])
const currentTab = useStorage(StorageName.ACTIVE_TAB, items.value[0].value)
const isDark = useDarkGlobal()
watch(isDark, (value) => {
    iframe.value?.contentWindow?.postMessage(
      `theme-${value ? 'dark' : 'light'}`,
      '*',
    )
})
const onChange = (payload: Record<string, any>) => {
    iframe.value!.srcdoc = generateHTML(payload, isDark.value)
}
onMounted(() => {
    Split(['#split-0', 'iframe'])
})
</script>

<template>
    <main class="border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-row h-full">
            <div id="split-0" class="w-full">
                <Tabs v-model="currentTab" :items="items" />
                <MonacoEditor :active-tab="currentTab" @change="onChange" />
            </div>
            <iframe
              ref="iframe"
              class="h-full w-full"
              sandbox="allow-scripts"
              frameBorder="0"
            />
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
</style>
