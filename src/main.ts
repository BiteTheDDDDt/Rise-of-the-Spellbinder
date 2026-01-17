import { createApp } from 'vue'
import { i18n, getLocale } from './i18n'
import './style.css'
import App from './App.vue'

i18n.global.locale.value = getLocale()

createApp(App).use(i18n).mount('#app')
