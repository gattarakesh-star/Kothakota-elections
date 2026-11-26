export const KEYS = ['jsp', 'tdp', 'nota'];

export const LABELS = {
  jsp: 'JSP+YCP',
  tdp: 'TDP',
  nota: 'NOTA',
};

export function blankVotes() {
  return { jsp: 0, tdp: 0, nota: 0 };
}

export function addVotes(target, source) {
  for (const key of KEYS) target[key] += Number(source?.[key] || 0);
  return target;
}

export function totalVotes(votes) {
  return KEYS.reduce((sum, key) => sum + Number(votes?.[key] || 0), 0);
}

export function contestTotals(rounds, type) {
  const totals = blankVotes();
  for (const round of rounds || []) addVotes(totals, round[type]);
  return totals;
}

export function presidentTotals(wards) {
  const totals = blankVotes();
  for (const ward of wards) {
    for (const round of ward.rounds || []) addVotes(totals, round.president);
  }
  return totals;
}

export function outcome(totals, complete) {
  if (totalVotes(totals) === 0) return { key: 'none', text: 'Awaiting votes', cls: 'pending' };

  const highest = Math.max(...KEYS.map((key) => totals[key]));
  const leaders = KEYS.filter((key) => totals[key] === highest);
  if (leaders.length > 1) return { key: 'tie', text: 'Tie', cls: 'tie' };

  const key = leaders[0];
  return {
    key,
    text: `${LABELS[key]} ${complete ? 'won' : 'leading'}`,
    cls: `${complete ? 'won' : 'leading'} ${key}`,
  };
}

export function maxRound(wards) {
  return wards.reduce((max, ward) => {
    const local = (ward.rounds || []).reduce((m, r) => Math.max(m, Number(r.round) || 0), 0);
    return Math.max(max, local);
  }, 0);
}

export function roundsHistory(wards) {
  const count = maxRound(wards);
  return Array.from({ length: count }, (_, index) => {
    const roundNumber = index + 1;
    const member = blankVotes();
    const president = blankVotes();
    for (const ward of wards) {
      const found = (ward.rounds || []).find((r) => Number(r.round) === roundNumber);
      if (found) {
        addVotes(member, found.member);
        addVotes(president, found.president);
      }
    }
    return { round: roundNumber, member, president };
  });
}

export function seatCounts(wards, complete) {
  const counts = { jsp: 0, tdp: 0, nota: 0, undecided: 0 };
  for (const ward of wards) {
    const result = outcome(contestTotals(ward.rounds, 'member'), complete);
    if (result.key === 'none' || result.key === 'tie') {
      counts.undecided += 1;
    } else {
      counts[result.key] += 1;
    }
  }
  return counts;
}
