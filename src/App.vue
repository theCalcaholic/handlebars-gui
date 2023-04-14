<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useDarkGlobal } from './utils';
const isDark = useDarkGlobal()
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" v-if="isDark" src="@/assets/logo_light.svg" width="64" height="64" />
    <img alt="Vue logo" class="logo" v-if="!isDark" src="@/assets/logo.svg" width="64" height="64" />
    <h1>Stencil</h1>

<!--    <div class="wrapper">-->
<!--      <HelloWorld msg="You did it!" />-->

<!--      <nav>-->
<!--&lt;!&ndash;        <RouterLink to="/">Home</RouterLink>&ndash;&gt;-->
<!--&lt;!&ndash;        <RouterLink to="/about">About</RouterLink>&ndash;&gt;-->
<!--&lt;!&ndash;        <RouterLink to="/editor">Editor</RouterLink>&ndash;&gt;-->
<!--      </nav>-->
<!--    </div>-->
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 200px;
  display: block;
  width: 100%;
  margin-bottom: 2em;
}

.logo {
  display: block;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    padding-right: calc(var(--section-gap) / 2);
    align-items: center;
  }

  header h1 {
      color: var(--color-title-text);
  }

  .logo {
    margin: 0;
    margin-right: 2em;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: nowrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
