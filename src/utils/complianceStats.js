/**
 * Shared 30-day compliance stats — extracted so Goals + Analytics can share one calc.
 */

import { calculateScheduledTasksForDate } from './calendarTasks'
import { generateTaskId } from './taskCompletion'
import { toKey } from '../components/calendar/MonthGrid'

/**
 * @returns {{
 *   compliancePct: number,
 *   streak: number,
 *   hasData: boolean,
 *   dailyStats: Array<{ date: string, planned: number, done: number, completed: boolean }>,
 *   grade: string,
 * }}
 */
export function getComplianceStats(protocols, supplements, reconItems, taskCompletion) {
  const days = [...Array(30)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d
  })

  let totalPlanned = 0
  let totalDone = 0
  const dailyStats = []

  for (const day of days) {
    const dateKey = toKey(day)
    const scheduledData = calculateScheduledTasksForDate(day, protocols || [], supplements || [], reconItems || [])

    let dayPlanned = 0
    let dayDone = 0

    Object.keys(scheduledData.bySlot || {}).forEach((timeSlot) => {
      const slot = scheduledData.bySlot[timeSlot]

      if (slot.peptides && Array.isArray(slot.peptides)) {
        slot.peptides.forEach((pep) => {
          const taskId = generateTaskId({
            type: 'peptide',
            name: pep.name || 'Peptide',
            dose: pep.dose || '',
            unit: pep.unit || '',
            time: timeSlot,
            protocolId: pep.protocolId,
            peptideId: pep.peptideId,
          })
          dayPlanned++
          const td = taskCompletion?.[dateKey]?.[timeSlot]?.[taskId]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
        })
      }

      if (slot.supplements && Array.isArray(slot.supplements)) {
        slot.supplements.forEach((supp) => {
          const taskId = generateTaskId({
            type: 'supplement',
            name: supp.name || 'Supplement',
            dose: supp.dose || '',
            unit: supp.unit || '',
            time: timeSlot,
          })
          dayPlanned++
          const td = taskCompletion?.[dateKey]?.[timeSlot]?.[taskId]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
        })
      }
    })

    totalPlanned += dayPlanned
    totalDone += dayDone
    dailyStats.push({
      date: dateKey,
      planned: dayPlanned,
      done: dayDone,
      completed: dayPlanned === 0 || dayDone === dayPlanned,
    })
  }

  const compliancePct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0
  let streak = 0
  for (let i = dailyStats.length - 1; i >= 0; i--) {
    if (dailyStats[i].completed) streak++
    else break
  }

  const grade =
    compliancePct >= 95 ? 'A+'
      : compliancePct >= 85 ? 'A'
        : compliancePct >= 75 ? 'B'
          : compliancePct >= 60 ? 'C'
            : compliancePct > 0 ? 'D' : '—'

  return {
    compliancePct,
    streak,
    hasData: totalPlanned > 0,
    dailyStats,
    grade,
  }
}

/** Count completed dose entries in taskCompletion map. */
export function countAllTimeDoses(taskCompletion) {
  let allTimeDoses = 0
  Object.keys(taskCompletion || {}).forEach((dk) => {
    const dayData = taskCompletion[dk] || {}
    Object.keys(dayData).forEach((slot) => {
      Object.values(dayData[slot] || {}).forEach((td) => {
        if (td === true || (td && typeof td === 'object' && td.completed)) allTimeDoses++
      })
    })
  })
  return allTimeDoses
}

/** Grade rank for comparison (higher = better). */
export function gradeRank(grade) {
  const map = { 'A+': 5, A: 4, B: 3, C: 2, D: 1, '—': 0 }
  return map[grade] ?? 0
}
