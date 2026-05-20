import { AtelierAPI } from './index'

declare global {
  interface Window {
    atelier: AtelierAPI
  }
}
