import create from 'zustand'

import { applyEvents, Event, EventAction } from '@home-gallery/events'

import { Entry } from './entry'
import { useEntryStore } from './entry-store'


const lruAdd = (list: string[], item: string, size: number = 50) => {
  const index = list.indexOf(item)
  if (index > 0) {
    list.splice(index, 1)
    list.unshift(item)
  } else if (index < 0 && list.length < size) {
    list.unshift(item)
  } else if (index < 0) {
    list.pop()
    list.unshift(item)
  }
}

const getEventTags = events => events
  .filter(event => event.type == 'userAction')
  .map(event => event.actions.filter(a => a.action == 'addTag'))
  .reduce((all, actions) => all.concat(actions), [])
  .map(action => action.value)

export interface EventStore {
  events: Event[]
  recentTags: string[]

  initEvents: (events: Event[]) => void
  addEvent: (event: Event) => void
}

const _applyEvents = (events: Event[]) => {
  const entries = [...useEntryStore.getState().allEntries]
  const t0 = Date.now()
  const changedEntries = applyEvents(entries, events)
  changedEntries.forEach((entry: any) => entry.textCache = false)
  console.log(`Applied ${events.length} events and updated ${changedEntries.length} entries in ${Date.now() - t0}ms`)
  useEntryStore.getState().setEntries(entries)
}

const getRecentTags = (events: Event[], recentTags: string[]) => {
  getEventTags(events).forEach(tag => lruAdd(recentTags, tag))
  return recentTags
}    

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  recentTags: [],

  initEvents: (events: Event[]) => set((state) => {
    _applyEvents(events)
    return {...state, events, recentTags: getRecentTags(events, [])}
  }),
  addEvent: (event: Event) => set((state) => {
    _applyEvents([event])
    const events = [...state.events, event]
    return {...state, events, recentTags: getRecentTags(events, state.recentTags)}
  }),
}))
