(function() {
  function parseHours(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getWeeksLeftUntilYearEnd(now) {
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const remainingMs = Math.max(0, yearEnd.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / 86400000);
    return Math.max(1, Math.ceil(remainingDays / 7));
  }

  function getHistoryHours(records, fallbackUnitLength) {
    return records.reduce((sum, record) => {
      const units = parseUnits(record);
      const unitLength = parseUnitLength(record) || fallbackUnitLength;
      return sum + (units * unitLength) / 60;
    }, 0);
  }

  function parseUnits(record) {
    const match = record.match(/^Units:\s*(\d+(?:\.\d+)?)/m);
    return match ? parseHours(match[1]) : 0;
  }

  function parseUnitLength(record) {
    const match = record.match(/^Unit Length Minutes:\s*(\d+(?:\.\d+)?)/m);
    return match ? parseHours(match[1]) : 0;
  }

  function calculateMilestone(targetHours, startingHours, historyHours, now) {
    const target = parseHours(targetHours);
    const starting = parseHours(startingHours);
    const history = parseHours(historyHours);
    const total = starting + history;
    const remaining = Math.max(0, target - total);
    const weeksLeft = getWeeksLeftUntilYearEnd(now);
    const neededPerWeek = remaining / weeksLeft;
    const progress = target > 0 ? Math.min(100, (total / target) * 100) : 0;

    return {
      target,
      starting,
      history,
      total,
      remaining,
      weeksLeft,
      neededPerWeek,
      progress,
      message: getFeedbackMessage(target, total, neededPerWeek)
    };
  }

  function getFeedbackMessage(target, total, neededPerWeek) {
    if (target <= 0) return 'Set a target to start tracking.';
    if (total >= target) return 'Great progress. Annual target reached.';
    if (neededPerWeek <= 20) return 'On track. Keep the streak going.';
    if (neededPerWeek <= 35) return 'Small push this week.';
    return 'Focus mode. One solid week at a time.';
  }

  function roundHours(value) {
    return Math.round(value * 10) / 10;
  }

  window.BillableMilestone = {
    calculateMilestone,
    getHistoryHours,
    getWeeksLeftUntilYearEnd,
    roundHours
  };
})();
