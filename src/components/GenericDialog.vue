<template>
  <div class="overlay">
    <div class="dialogue">
      <p class="dialogue-text">{{ text }}</p>
      <div class="buttons">
        <button v-for="choice in choices" type="button" :key="choice"
          @click="onChoiceSelected(choice)">
          {{ choice }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, defineProps } from "vue";
const props = defineProps<{
  text: string,
  choices: Array<string>,
}>()

const emit
  = defineEmits<(e: 'choice', choice: string) => void>()
const onChoiceSelected = (choice: string) => {
  emit('choice', choice)
}
</script>

<style scoped>
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    width: 100vw;
    height: 100vh;
    background-color: #2c3e5088;
    justify-content: space-around;
    align-items: center;
}

.dialogue {
    display: flex;
    min-width: 600px;
    padding: 2em;
    flex-direction: column;
    justify-content: space-between;
    background-color: var(--color-background-soft);
    border-radius: 5px;
}

.dialogue * {
    margin: 2em;
}

.dialogue-text {
    display: block;
    height: 4em;
    background-color: var(--color-contrast-background);
    color: var(--color-text);
    border-radius: 5px;
    padding: 1em;
    text-align: center;
}

.buttons {
    display: flex;
    justify-content: space-between;
}

.buttons button {
    padding: 1em;
}

</style>
