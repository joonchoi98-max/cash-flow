// 원리금균등상환 월 납입액 계산
export function calcMonthlyPayment(principal, annualRate, termYears) {
  if (annualRate === 0) return principal / (termYears * 12)
  const r = annualRate / 12
  const n = termYears * 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// 연도별 상환 스케줄 생성
export function buildRepaymentSchedule(loans, startYear, years = 8) {
  const schedule = []

  for (let y = 0; y < years; y++) {
    const year = startYear + y
    let totalPrincipal = 0
    let totalInterest = 0
    const loanDetails = []

    for (const loan of loans) {
      const yearsElapsed = year - loan.startYear
      if (yearsElapsed < 0 || yearsElapsed >= loan.termYears) {
        loanDetails.push({ loanId: loan.id, name: loan.name, principal: 0, interest: 0 })
        continue
      }

      const monthly = calcMonthlyPayment(loan.principal, loan.annualRate, loan.termYears)
      const r = loan.annualRate / 12
      const n = loan.termYears * 12
      const monthsElapsedStart = yearsElapsed * 12
      const monthsElapsedEnd = Math.min(monthsElapsedStart + 12, n)

      let yearPrincipal = 0
      let yearInterest = 0
      let balance = loan.principal * Math.pow(1 + r, monthsElapsedStart) - monthly * (Math.pow(1 + r, monthsElapsedStart) - 1) / r

      for (let m = monthsElapsedStart; m < monthsElapsedEnd; m++) {
        const interestPayment = balance * r
        const principalPayment = monthly - interestPayment
        yearInterest += interestPayment
        yearPrincipal += principalPayment
        balance -= principalPayment
      }

      totalPrincipal += yearPrincipal
      totalInterest += yearInterest
      loanDetails.push({ loanId: loan.id, name: loan.name, principal: Math.round(yearPrincipal), interest: Math.round(yearInterest) })
    }

    schedule.push({
      year,
      totalPrincipal: Math.round(totalPrincipal),
      totalInterest: Math.round(totalInterest),
      totalRepayment: Math.round(totalPrincipal + totalInterest),
      loans: loanDetails,
    })
  }

  return schedule
}

// 연도별 자기자본 추이
export function buildEquitySchedule(loans, schedule, initialEquity, annualIncomes, monthlyLivingCost, startYear) {
  const result = []
  let equity = initialEquity
  let totalDebt = loans.reduce((s, l) => s + l.principal, 0)

  for (const row of schedule) {
    const income = annualIncomes.find(i => i.year === row.year)?.amount || 0
    const living = monthlyLivingCost * 12
    const afterRepayment = income - row.totalRepayment
    const savings = afterRepayment - living

    equity += savings + row.totalPrincipal
    totalDebt -= row.totalPrincipal

    result.push({
      year: row.year,
      income,
      totalRepayment: row.totalRepayment,
      afterRepayment,
      living,
      savings,
      equity: Math.round(equity),
      totalDebt: Math.round(Math.max(0, totalDebt)),
      totalAsset: Math.round(equity + Math.max(0, totalDebt)),
    })
  }

  return result
}
