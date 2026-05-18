(function() {
  const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const HOURS_EPSILON = 0.0001;

  function parseHours(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function parseDateKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return toDateKey(date);
  }

  function toDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function fromDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function compareDateKeys(a, b) {
    return a.localeCompare(b);
  }

  function getWeekStart(date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return startOfDay(addDays(date, diff));
  }

  function getWeekKey(date) {
    return toDateKey(getWeekStart(date));
  }

  function getWeekdayDates(date) {
    const weekStart = getWeekStart(date);
    return [0, 1, 2, 3, 4].map((offset) => addDays(weekStart, offset));
  }

  function getEffectiveYearStart(now) {
    return new Date(now.getFullYear(), 0, 1);
  }

  function getYearEnd(now) {
    return new Date(now.getFullYear(), 11, 31);
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
    const first = new Date(year, monthIndex, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (nth - 1) * 7);
  }

  function lastWeekdayOfMonth(year, monthIndex, weekday) {
    const last = new Date(year, monthIndex + 1, 0);
    const offset = (last.getDay() - weekday + 7) % 7;
    return new Date(year, monthIndex, last.getDate() - offset);
  }

  function addObservedHoliday(holidayMap, name, date) {
    let observed = date;
    if (date.getDay() === 6) observed = addDays(date, -1);
    if (date.getDay() === 0) observed = addDays(date, 1);
    holidayMap[toDateKey(observed)] = name;
  }

  function getUsFederalHolidays(year) {
    const holidays = {};
    addObservedHoliday(holidays, "New Year's Day", new Date(year, 0, 1));
    holidays[toDateKey(nthWeekdayOfMonth(year, 0, 1, 3))] = 'MLK Day';
    holidays[toDateKey(nthWeekdayOfMonth(year, 1, 1, 3))] = "Washington's Birthday";
    holidays[toDateKey(lastWeekdayOfMonth(year, 4, 1))] = 'Memorial Day';
    addObservedHoliday(holidays, 'Juneteenth', new Date(year, 5, 19));
    addObservedHoliday(holidays, 'Independence Day', new Date(year, 6, 4));
    holidays[toDateKey(nthWeekdayOfMonth(year, 8, 1, 1))] = 'Labor Day';
    holidays[toDateKey(nthWeekdayOfMonth(year, 9, 1, 2))] = 'Columbus Day';
    addObservedHoliday(holidays, 'Veterans Day', new Date(year, 10, 11));
    holidays[toDateKey(nthWeekdayOfMonth(year, 10, 4, 4))] = 'Thanksgiving Day';
    addObservedHoliday(holidays, 'Christmas Day', new Date(year, 11, 25));
    return holidays;
  }

  function getHolidayName(date) {
    const holidays = getUsFederalHolidays(date.getFullYear());
    return holidays[toDateKey(date)] || '';
  }

  function isBaseWorkday(date) {
    return !isWeekend(date) && !getHolidayName(date);
  }

  function getWorkdaysBetween(startDate, endDate, options = {}) {
    const manualOffDates = new Set(options.manualOffDates || []);
    const dates = [];
    let cursor = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (cursor.getTime() <= end.getTime()) {
      const key = toDateKey(cursor);
      if (isBaseWorkday(cursor) && !manualOffDates.has(key)) dates.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }

    return dates;
  }

  function getHistoryHours(records, fallbackUnitLength) {
    return records.reduce((sum, record) => {
      const units = parseUnits(record);
      const unitLength = parseUnitLength(record) || fallbackUnitLength;
      return sum + (units * unitLength) / 60;
    }, 0);
  }

  function getLoggedHoursForDate(records, fallbackUnitLength, dateKey, currentYear) {
    return records.reduce((sum, record) => {
      return getRecordDateKey(record, currentYear) === dateKey ? sum + getRecordHours(record, fallbackUnitLength) : sum;
    }, 0);
  }

  function getLoggedHoursBetween(records, fallbackUnitLength, startDate, endDate, currentYear) {
    const startKey = toDateKey(startDate);
    const endKey = toDateKey(endDate);
    return records.reduce((sum, record) => {
      const recordDateKey = getRecordDateKey(record, currentYear);
      if (!recordDateKey || compareDateKeys(recordDateKey, startKey) < 0 || compareDateKeys(recordDateKey, endKey) > 0) {
        return sum;
      }
      return sum + getRecordHours(record, fallbackUnitLength);
    }, 0);
  }

  function getRecordHours(record, fallbackUnitLength) {
    const units = parseUnits(record);
    const unitLength = parseUnitLength(record) || fallbackUnitLength;
    return (units * unitLength) / 60;
  }

  function getRecordDateKey(record, currentYear) {
    const workDateMatch = record.match(/^Work Date:\s*(\d{4}-\d{2}-\d{2})/m);
    if (workDateMatch) return parseDateKey(workDateMatch[1]);

    const startMatch = record.match(/^Start:\s*(\d{2})-(\d{2})\s+/m);
    if (!startMatch) return null;

    const month = Number(startMatch[1]);
    const day = Number(startMatch[2]);
    return toDateKey(new Date(currentYear, month - 1, day));
  }

  function parseUnits(record) {
    const match = record.match(/^Units:\s*(\d+(?:\.\d+)?)/m);
    return match ? parseHours(match[1]) : 0;
  }

  function parseUnitLength(record) {
    const match = record.match(/^Unit Length Minutes:\s*(\d+(?:\.\d+)?)/m);
    return match ? parseHours(match[1]) : 0;
  }

  function normalizeManualOffDates(value) {
    return Array.isArray(value) ? value.filter((dateKey) => parseDateKey(dateKey)) : [];
  }

  function createOrUpdateWeekPlan(existingPlan, context) {
    const now = startOfDay(context.now);
    const todayKey = toDateKey(now);
    const weekKey = getWeekKey(now);
    const dailyBaseHours = getWeekDailyBaseHours(context);
    const manualOffDates = normalizeManualOffDates(
      existingPlan && existingPlan.weekKey === weekKey ? existingPlan.manualOffDates : []
    );

    let plan = existingPlan && existingPlan.weekKey === weekKey ? {
      ...existingPlan,
      manualOffDates,
      assignedByDate: existingPlan.assignedByDate || {}
    } : {
      weekKey,
      plannedHours: 0,
      dailyBaseHours,
      assignedByDate: {},
      manualOffDates,
      lastAllocatedDate: ''
    };

    if (!existingPlan || existingPlan.weekKey !== weekKey || hasWeekDailyBaseChanged(plan, dailyBaseHours)) {
      const effectiveYearStart = getEffectiveYearStart(context.now);
      const planStart = new Date(Math.max(now.getTime(), effectiveYearStart.getTime()));
      const workdays = getWorkdaysBetween(planStart, addDays(getWeekStart(now), 4), { manualOffDates });
      plan.plannedHours = workdays.length * dailyBaseHours;
      plan.dailyBaseHours = dailyBaseHours;
      plan.assignedByDate = {};
      plan.lastAllocatedDate = '';
      workdays.forEach((date) => {
        plan.assignedByDate[toDateKey(date)] = dailyBaseHours;
      });
    }

    if (plan.lastAllocatedDate !== todayKey) {
      plan = allocateRemainingWeek(plan, context);
    }

    return plan;
  }

  function getWeekDailyBaseHours(context) {
    return Number.isFinite(context.currentQuarterDailyBaseHours)
      ? context.currentQuarterDailyBaseHours
      : context.longTermDailyBaseHours;
  }

  function hasWeekDailyBaseChanged(plan, dailyBaseHours) {
    return Math.abs((plan.dailyBaseHours || 0) - dailyBaseHours) > HOURS_EPSILON;
  }

  function toggleManualOffDate(plan, dateKey, context) {
    const weekKey = getWeekKey(context.now);
    const basePlan = plan && plan.weekKey === weekKey ? plan : createOrUpdateWeekPlan(plan, context);
    const manualOffDates = new Set(normalizeManualOffDates(basePlan.manualOffDates));

    if (manualOffDates.has(dateKey)) {
      manualOffDates.delete(dateKey);
    } else {
      manualOffDates.add(dateKey);
    }

    const nextPlan = {
      ...basePlan,
      manualOffDates: Array.from(manualOffDates).sort(),
      assignedByDate: { ...(basePlan.assignedByDate || {}) },
      lastAllocatedDate: ''
    };

    return allocateRemainingWeek(nextPlan, context, {
      includeTodayLogged: manualOffDates.has(toDateKey(startOfDay(context.now)))
    });
  }

  function allocateRemainingWeek(plan, context, options = {}) {
    const now = startOfDay(context.now);
    const todayKey = toDateKey(now);
    const weekEnd = addDays(getWeekStart(now), 4);
    const effectiveYearStart = getEffectiveYearStart(context.now);
    const allocationStart = new Date(Math.max(now.getTime(), effectiveYearStart.getTime()));
    const manualOffDates = normalizeManualOffDates(plan.manualOffDates);
    const remainingDates = getWorkdaysBetween(allocationStart, weekEnd, { manualOffDates });
    const loggedBeforeToday = getLoggedHoursBetween(
      context.records,
      context.fallbackUnitLength,
      getWeekStart(now),
      addDays(now, -1),
      now.getFullYear()
    );
    const todayLogged = options.includeTodayLogged
      ? getLoggedHoursForDate(context.records, context.fallbackUnitLength, todayKey, now.getFullYear())
      : 0;
    const remainingHours = plan.plannedHours - loggedBeforeToday - todayLogged;
    const perDay = remainingDates.length > 0 ? remainingHours / remainingDates.length : 0;
    const assignedByDate = { ...(plan.assignedByDate || {}) };

    getWeekdayDates(now).forEach((date) => {
      const key = toDateKey(date);
      if (compareDateKeys(key, todayKey) >= 0) delete assignedByDate[key];
    });

    remainingDates.forEach((date) => {
      assignedByDate[toDateKey(date)] = perDay;
    });

    return {
      ...plan,
      manualOffDates,
      assignedByDate,
      lastAllocatedDate: todayKey
    };
  }

  function buildWeekCards(plan, context) {
    const now = startOfDay(context.now);
    const todayKey = toDateKey(now);
    const manualOffDates = new Set(normalizeManualOffDates(plan.manualOffDates));

    return getWeekdayDates(now).map((date, index) => {
      const dateKey = toDateKey(date);
      const holidayName = getHolidayName(date);
      const isPast = compareDateKeys(dateKey, todayKey) < 0;
      const isManualOff = manualOffDates.has(dateKey);
      const isHoliday = Boolean(holidayName);
      const isWeekendDate = isWeekend(date);
      const isOff = isPast || isManualOff || isHoliday || isWeekendDate;
      const assignedHours = plan.assignedByDate?.[dateKey] || 0;
      const loggedHours = getLoggedHoursForDate(
        context.records,
        context.fallbackUnitLength,
        dateKey,
        now.getFullYear()
      );
      const displayHours = dateKey === todayKey ? assignedHours - loggedHours : assignedHours;

      return {
        label: WEEKDAY_LABELS[index],
        dateKey,
        holidayName,
        isToday: dateKey === todayKey,
        isPast,
        isManualOff,
        isHoliday,
        isOff,
        assignedHours,
        loggedHours,
        displayHours,
        reason: getCardReason({ isPast, isManualOff, isHoliday, holidayName })
      };
    });
  }

  function getCardReason(card) {
    if (card.isPast) return 'Past';
    if (card.isManualOff) return 'Off';
    if (card.isHoliday) return card.holidayName || 'Holiday';
    return '';
  }

  function buildQuarterSummaries(context) {
    const now = startOfDay(context.now);
    const effectiveYearStart = getEffectiveYearStart(now);
    const quarterTargetHours = context.target > 0 ? context.target / 4 : 0;
    const currentQuarterIndex = Math.floor(now.getMonth() / 3);
    const historyHours = getHistoryHours(context.records, context.fallbackUnitLength);
    const untrackedCompletedHours = Math.max(0, context.total - historyHours);
    const untrackedAllocations = getUntrackedQuarterAllocations(
      context,
      untrackedCompletedHours,
      quarterTargetHours,
      currentQuarterIndex,
      effectiveYearStart
    );
    let carryIntoCurrentQuarter = 0;

    const quarters = [0, 1, 2, 3].map((quarterIndex) => {
      const quarterStart = new Date(now.getFullYear(), quarterIndex * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), quarterIndex * 3 + 3, 0);
      const startsBeforeEffectiveYear = quarterEnd.getTime() < effectiveYearStart.getTime();
      const isPast = quarterEnd.getTime() < now.getTime();
      const isCurrent = quarterStart.getTime() <= now.getTime() && quarterEnd.getTime() >= now.getTime();
      const loggedHours = startsBeforeEffectiveYear ? 0 : getQuarterLoggedHours(
        context,
        quarterStart,
        quarterEnd,
        quarterIndex,
        untrackedAllocations
      );

      return {
        quarterIndex,
        quarterStart,
        quarterEnd,
        startsBeforeEffectiveYear,
        isPast,
        isCurrent,
        loggedHours
      };
    });

    return quarters.map((quarter) => {
      const periodStart = new Date(Math.max(now.getTime(), effectiveYearStart.getTime(), quarter.quarterStart.getTime()));
      const workdays = quarter.startsBeforeEffectiveYear || quarter.isPast ? [] : getWorkdaysBetween(periodStart, quarter.quarterEnd);
      const plannedHours = quarter.startsBeforeEffectiveYear ? 0 : quarterTargetHours;
      let remainingHours = plannedHours;

      if (!quarter.startsBeforeEffectiveYear && quarter.quarterIndex < currentQuarterIndex) {
        remainingHours = plannedHours + carryIntoCurrentQuarter - quarter.loggedHours;
        carryIntoCurrentQuarter = Math.min(0, remainingHours);
      } else if (!quarter.startsBeforeEffectiveYear && quarter.quarterIndex === currentQuarterIndex) {
        remainingHours = plannedHours + carryIntoCurrentQuarter - quarter.loggedHours;
      }

      return {
        label: `Q${quarter.quarterIndex + 1}`,
        workdays: workdays.length,
        plannedHours,
        loggedHours: quarter.loggedHours,
        remainingHours,
        status: quarter.startsBeforeEffectiveYear ? 'inactive' : quarter.isCurrent ? 'current' : quarter.isPast ? 'completed' : 'upcoming'
      };
    });
  }

  function getCurrentQuarterDailyBaseHours(quarters) {
    const currentQuarter = quarters.find((quarter) => quarter.status === 'current');
    if (!currentQuarter || currentQuarter.workdays <= 0) return 0;
    return Math.max(0, currentQuarter.remainingHours) / currentQuarter.workdays;
  }

  function getQuarterLoggedHours(context, quarterStart, quarterEnd, quarterIndex, untrackedAllocations) {
    const recordHours = getLoggedHoursBetween(
      context.records,
      context.fallbackUnitLength,
      quarterStart,
      quarterEnd,
      quarterStart.getFullYear()
    );
    return recordHours + (untrackedAllocations[quarterIndex] || 0);
  }

  function getUntrackedQuarterAllocations(context, untrackedCompletedHours, quarterTargetHours, currentQuarterIndex, effectiveYearStart) {
    const mode = context.allocationMode || 'auto';
    if (mode === 'custom') {
      const customValues = Array.isArray(context.quarterAllocations) ? context.quarterAllocations : [];
      return [0, 1, 2, 3].map((index) => parseHours(customValues[index]));
    }

    if (mode === 'current') {
      return [0, 1, 2, 3].map((_, index) => index === currentQuarterIndex ? untrackedCompletedHours : 0);
    }

    return getAutoQuarterAllocations(untrackedCompletedHours, quarterTargetHours, currentQuarterIndex, effectiveYearStart);
  }

  function getAutoQuarterAllocations(untrackedCompletedHours, quarterTargetHours, currentQuarterIndex, effectiveYearStart) {
    const allocations = [0, 0, 0, 0];
    let remaining = untrackedCompletedHours;

    for (let index = 0; index <= currentQuarterIndex && remaining > 0; index += 1) {
      const quarterEnd = new Date(effectiveYearStart.getFullYear(), index * 3 + 3, 0);
      if (quarterEnd.getTime() < effectiveYearStart.getTime()) continue;

      if (index === currentQuarterIndex) {
        allocations[index] = remaining;
      } else {
        allocations[index] = Math.min(remaining, quarterTargetHours);
      }
      remaining -= allocations[index];
    }

    return allocations;
  }

  function calculateMilestone(settings, records, fallbackUnitLength, now, weekPlan) {
    const target = parseHours(settings.targetHours);
    const starting = parseHours(settings.startingHours);
    const history = getHistoryHours(records, fallbackUnitLength);
    const total = starting;
    const annualRemainingHours = Math.max(0, target - total);
    const effectiveYearStart = getEffectiveYearStart(now);
    const today = startOfDay(now);
    const yearEnd = getYearEnd(now);
    const remainingWorkdays = target > 0 && today.getTime() <= yearEnd.getTime()
      ? getWorkdaysBetween(new Date(Math.max(today.getTime(), effectiveYearStart.getTime())), yearEnd).length
      : 0;
    const longTermDailyBaseHours = remainingWorkdays > 0 ? annualRemainingHours / remainingWorkdays : 0;
    const progress = target > 0 ? (total / target) * 100 : 0;
    const context = {
      now,
      target,
      total,
      records,
      fallbackUnitLength,
      allocationMode: settings.allocationMode || 'auto',
      quarterAllocations: settings.quarterAllocations || [],
      effectiveYearStart: toDateKey(effectiveYearStart),
      longTermDailyBaseHours,
      manualOffDates: normalizeManualOffDates(weekPlan?.manualOffDates)
    };
    const quarters = buildQuarterSummaries(context);
    context.currentQuarterDailyBaseHours = getCurrentQuarterDailyBaseHours(quarters);
    const ensuredWeekPlan = createOrUpdateWeekPlan(weekPlan, context);
    context.manualOffDates = normalizeManualOffDates(ensuredWeekPlan.manualOffDates);

    return {
      target,
      starting,
      history,
      total,
      annualRemainingHours,
      remainingWorkdays,
      longTermDailyBaseHours,
      progress,
      effectiveYearStart: toDateKey(effectiveYearStart),
      currentQuarterDailyBaseHours: context.currentQuarterDailyBaseHours,
      weekPlan: ensuredWeekPlan,
      weekCards: buildWeekCards(ensuredWeekPlan, context),
      quarters,
      message: getFeedbackMessage(target, total, longTermDailyBaseHours)
    };
  }

  function getFeedbackMessage(target, total, dailyBaseHours) {
    if (target <= 0) return 'Set a target to start tracking.';
    if (total >= target) return 'Annual target reached.';
    if (dailyBaseHours <= 4) return 'Light daily pace.';
    if (dailyBaseHours <= 8) return 'Steady daily pace.';
    return 'High daily pace. Protect the calendar.';
  }

  function roundHours(value) {
    return Math.round(value * 10) / 10;
  }

  window.BillableMilestone = {
    calculateMilestone,
    createOrUpdateWeekPlan,
    toggleManualOffDate,
    getHistoryHours,
    getLoggedHoursForDate,
    getWeekKey,
    toDateKey,
    roundHours
  };
})();
