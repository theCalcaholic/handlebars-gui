<template>
  {{ generateHTML(editorValue, isDark.value) }}
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { StorageName, generateHTML, useDarkGlobal } from '../utils'

const isDark = useDarkGlobal()
const editorValue = useStorage(StorageName.EDITOR_VALUE,
  {html: '<div>NOT FOUND</div>', markdown: '', css: ''})

</script>
