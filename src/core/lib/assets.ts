import c3g from '../data/c3g.json'
import dbdDash from '../data/dbd-dash.json'
import doptlet from '../data/doptlet.json'
import gamifient from '../data/gamifient.json'
import vonjo from '../data/vonjo.json'

export const apps: Record<AppName, App> = {
  c3g,
  'dbd-dash': dbdDash as App,
  doptlet,
  gamifient,
  vonjo,
}