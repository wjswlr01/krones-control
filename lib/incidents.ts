import incidentsData from '@/data/incidents.json'

export interface Incident {
  id: string
  factory: string
  workplace: string
  workplace_type: string
  equipment: string
  product: string
  incident_type: string
  incident_date: string
  start_time: string
  end_time: string
  downtime_min: number
  target_process: string
  title: string
  cause: string
  action: string
  author: string
  department: string
  created_at: string
  is_best_practice: boolean
  is_long_downtime: boolean
}

const INCIDENTS = incidentsData as Incident[]

export function getAllIncidents(): Incident[] { return INCIDENTS }
export function getIncidentById(id: string): Incident | undefined {
  return INCIDENTS.find(i => i.id === id)
}

export interface IncidentFilters {
  factory?: string
  workplace_type?: string
  is_best_practice?: boolean
  is_long_downtime?: boolean
  labeler_only?: boolean
}

export function searchIncidents(query: string, filters: IncidentFilters = {}, limit = 200): Incident[] {
  let results = INCIDENTS
  if (filters.factory) results = results.filter(i => i.factory === filters.factory)
  if (filters.workplace_type) results = results.filter(i => i.workplace_type === filters.workplace_type)
  if (filters.is_best_practice) results = results.filter(i => i.is_best_practice)
  if (filters.is_long_downtime) results = results.filter(i => i.is_long_downtime)
  if (filters.labeler_only) {
    results = results.filter(i =>
      ['라벨', '라벨러', '라벨라'].some(k =>
        (i.title + i.cause + i.action + i.equipment + i.workplace).includes(k)
      )
    )
  }
  if (query.trim()) {
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
    results = results.filter(i => {
      const text = (i.title + ' ' + i.cause + ' ' + i.action + ' ' + i.equipment + ' ' + i.workplace + ' ' + i.product).toLowerCase()
      return keywords.every(k => text.includes(k))
    })
  }
  return results.slice(0, limit)
}

export function getFactoryList(): string[] {
  const set = new Set<string>()
  INCIDENTS.forEach(i => { if (i.factory) set.add(i.factory) })
  return Array.from(set).sort()
}

export function getStats() {
  return {
    total: INCIDENTS.length,
    bestPractice: INCIDENTS.filter(i => i.is_best_practice).length,
    longDowntime: INCIDENTS.filter(i => i.is_long_downtime).length,
  }
}
