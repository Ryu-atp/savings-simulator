/**
 * 目標額達成に必要な月々の積立額を計算する（Pure Function）
 *
 * @param {Object} params
 * @param {number} params.targetAmount - 目標金額（円）
 * @param {number} params.annualRate - 年利（%）
 * @param {number} params.years - 積立期間（年）
 * @returns {number} 必要な月々の積立額（円、切り上げ）
 * @throws {Error} 不正な入力値の場合
 */
export const calculateRequiredMonthlySavings = ({
  targetAmount,
  annualRate,
  years,
}) => {
  if (
    typeof targetAmount !== 'number' ||
    typeof annualRate !== 'number' ||
    typeof years !== 'number'
  ) {
    throw new Error('引数はすべて数値で指定してください。');
  }

  if (targetAmount < 0) {
    throw new Error('目標金額は0以上に設定してください。');
  }
  if (annualRate < 0) {
    throw new Error('年利は0以上に設定してください。');
  }
  if (years <= 0) {
    throw new Error('期間は1年以上に設定してください。');
  }

  // 金利が0%の場合は単純な割り算
  if (annualRate === 0) {
    return Math.ceil(targetAmount / (years * 12));
  }

  const r = annualRate / 100 / 12; // 月利
  const n = years * 12; // 積立月数

  // 積立額計算の公式: PMT = FV * r / ((1 + r)^n - 1)
  const pmt = (targetAmount * r) / (Math.pow(1 + r, n) - 1);

  // 安全をみて切り上げ
  return Math.ceil(pmt);
};

/**
 * 年齢ベースで目標額達成に必要な月々の積立額を計算する
 *
 * @param {Object} params
 * @param {number} params.age - 現在の年齢
 * @param {number} params.targetAge - 目標達成時の年齢
 * @param {number} params.targetAmount - 目標金額（円）
 * @param {number} params.annualRate - 年利（%）
 * @returns {number} 必要な月々の積立額（円）
 * @throws {Error} 不正な入力値の場合
 */
export const calculateRequiredMonthlySavingsWithAge = ({
  age,
  targetAge,
  targetAmount,
  annualRate,
}) => {
  if (typeof age !== 'number' || typeof targetAge !== 'number') {
    throw new Error('年齢は数値で指定してください。');
  }
  if (targetAge <= age) {
    throw new Error('目標年齢は現在の年齢より大きくなければなりません。');
  }

  const years = targetAge - age;
  return calculateRequiredMonthlySavings({ targetAmount, annualRate, years });
};

/**
 * プリセットまたは自由入力額に応じた目標額達成に必要な積立額を計算する (Pure Function)
 *
 * @param {Object} params
 * @param {number} params.age - 現在の年齢
 * @param {number} params.targetAge - 目標達成時の年齢
 * @param {Object|null} params.selectedTarget - 選択された目標プリセット
 * @param {string|number} params.customAmount - 自由入力金額（万円単位）
 * @param {number} params.annualRate - 想定年利（%）
 * @returns {number} 必要な月々の積立額（円）
 */
export const calculateRequiredSavingsWithPresetOrCustom = ({
  age,
  targetAge,
  selectedTarget,
  customAmount,
  annualRate,
}) => {
  const targetAmount = selectedTarget
    ? selectedTarget.amount
    : (parseFloat(customAmount) || 0) * 10000;

  return calculateRequiredMonthlySavingsWithAge({
    age,
    targetAge,
    targetAmount,
    annualRate,
  });
};

/**
 * 税金区分に応じた資産額シミュレーションを再計算する
 * 
 * @param {Object} params
 * @param {number} params.currentAsset - 初期資産
 * @param {number} params.principal - 1回あたりの積立額
 * @param {number} params.annualRate - 年利（%）
 * @param {number} params.years - 運用年数
 * @param {string} params.frequencyId - 積立頻度ID ('monthly', 'weekly', 'daily', 'yearly')
 * @param {string} params.taxMode - 税金モード ('none', 'tax', 'nisa')
 * @returns {Object} 再計算された結果（yearlyBreakdown, futureValue, totalGain, gainRate, principalTotal）
 */
export const recalculateWithTaxMode = ({
  currentAsset = 0,
  principal,
  annualRate,
  years,
  frequencyId,
  taxMode = 'none',
  calculationType = 'annualRate',
}) => {
  const P = parseFloat(principal) || 0;
  const n = parseInt(years, 10) || 0;

  const r = parseFloat(annualRate) || 0;
  const r_annual = r / 100;

  const actualTaxMode = taxMode;

  // 頻度に応じた設定
  const periodsPerYearMap = {
    monthly: 12,
    weekly: 52,
    daily: 365,
    yearly: 1,
  };
  const periodsPerYear = periodsPerYearMap[frequencyId] || 12;

  const yearlyBreakdown = [];
  
  // 0年目（初期値）
  yearlyBreakdown.push({
    year: 0,
    value: currentAsset,
    gain: 0,
    principalAccum: currentAsset,
    assetGrowth: currentAsset,
  });

  if (actualTaxMode === 'none') {
    if (frequencyId === 'yearly') {
      for (let year = 1; year <= n; year++) {
        const assetGrowth = currentAsset * Math.pow(1 + r_annual, year);
        const savingsGrowth = r_annual === 0
          ? P * year
          : P * (Math.pow(1 + r_annual, year) - 1) / r_annual;
        const value = assetGrowth + savingsGrowth;
        const principalAccum = currentAsset + (P * year);
        yearlyBreakdown.push({
          year,
          value: Math.round(value),
          gain: Math.round(value - principalAccum),
          principalAccum: Math.round(principalAccum),
          assetGrowth: Math.round(assetGrowth),
        });
      }
    } else {
      const r_period = r_annual / periodsPerYear;
      for (let year = 1; year <= n; year++) {
        const totalPeriods = year * periodsPerYear;
        const assetGrowth = currentAsset * Math.pow(1 + r_annual, year);
        const savingsGrowth = r_period === 0
          ? P * totalPeriods
          : P * (Math.pow(1 + r_period, totalPeriods) - 1) / r_period;
        const value = assetGrowth + savingsGrowth;
        const principalAccum = currentAsset + (P * totalPeriods);
        yearlyBreakdown.push({
          year,
          value: Math.round(value),
          gain: Math.round(value - principalAccum),
          principalAccum: Math.round(principalAccum),
          assetGrowth: Math.round(assetGrowth),
        });
      }
    }
  } else if (actualTaxMode === 'tax') {
    let currentAssetValue = currentAsset;
    let savingsValue = 0;
    let accumulatedPrincipal = currentAsset;

    const r_period = frequencyId === 'yearly' ? r_annual : r_annual / periodsPerYear;
    const stepsInYear = frequencyId === 'yearly' ? 1 : periodsPerYear;

    for (let year = 1; year <= n; year++) {
      // 1. 初期資産の成長（年次複利、年20%課税）
      const assetGrowthBeforeTax = currentAssetValue * (1 + r_annual);
      const assetGrowthGain = assetGrowthBeforeTax - currentAssetValue;
      const assetGrowthTax = assetGrowthGain > 0 ? assetGrowthGain * 0.20 : 0;
      const assetGrowth = assetGrowthBeforeTax - assetGrowthTax;
      currentAssetValue = assetGrowth;

      // 2. 積立資産の成長（期間複利、年20%課税）
      const savingsYearStart = savingsValue;
      let savingsYearEndBeforeTax = savingsYearStart;
      
      if (frequencyId === 'yearly') {
        savingsYearEndBeforeTax = savingsYearStart * (1 + r_annual) + P;
      } else {
        for (let step = 1; step <= stepsInYear; step++) {
          savingsYearEndBeforeTax = savingsYearEndBeforeTax * (1 + r_period) + P;
        }
      }

      const addedPrincipalThisYear = P * stepsInYear;
      const savingsGain = savingsYearEndBeforeTax - savingsYearStart - addedPrincipalThisYear;
      const savingsTax = savingsGain > 0 ? savingsGain * 0.20 : 0;
      const savingsValueAfterTax = savingsYearEndBeforeTax - savingsTax;
      savingsValue = savingsValueAfterTax;

      accumulatedPrincipal += addedPrincipalThisYear;
      const totalValue = assetGrowth + savingsValue;

      yearlyBreakdown.push({
        year,
        value: Math.round(totalValue),
        gain: Math.round(totalValue - accumulatedPrincipal),
        principalAccum: Math.round(accumulatedPrincipal),
        assetGrowth: Math.round(assetGrowth),
      });
    }
  } else if (actualTaxMode === 'nisa') {
    const NISA_LIMIT = 12_000_000;
    
    // 1. 初期資産の初期状態
    let nisaAssetGrowth = Math.min(currentAsset, NISA_LIMIT);
    let taxableAssetGrowth = Math.max(0, currentAsset - NISA_LIMIT);
    
    // 2. 積立資産の初期状態
    let savingsNisaValue = 0;
    let savingsTaxableValue = 0;
    
    // NISA枠管理用累計元本（初期資産分ですでに一部/全部が埋まっている）
    let nisaPrincipal = nisaAssetGrowth;
    let taxablePrincipal = taxableAssetGrowth;

    const r_period = frequencyId === 'yearly' ? r_annual : r_annual / periodsPerYear;
    const stepsInYear = frequencyId === 'yearly' ? 1 : periodsPerYear;

    for (let year = 1; year <= n; year++) {
      // --- ① 初期資産の成長（年次複利） ---
      // NISA枠内初期資産（非課税）
      nisaAssetGrowth = nisaAssetGrowth * (1 + r_annual);
      
      // 特定口座内初期資産（20%課税）
      const taxableAssetGrowthBeforeTax = taxableAssetGrowth * (1 + r_annual);
      const taxableAssetGrowthGain = taxableAssetGrowthBeforeTax - taxableAssetGrowth;
      const taxableAssetGrowthTax = taxableAssetGrowthGain > 0 ? taxableAssetGrowthGain * 0.20 : 0;
      taxableAssetGrowth = taxableAssetGrowthBeforeTax - taxableAssetGrowthTax;

      // --- ② 積立資産の成長（期間複利） ---
      const savingsNisaYearStart = savingsNisaValue;
      const savingsTaxableYearStart = savingsTaxableValue;

      let savingsNisaYearEnd = savingsNisaYearStart;
      let savingsTaxableYearEnd = savingsTaxableYearStart;

      let addedToNisaThisYear = 0;
      let addedToTaxableThisYear = 0;

      if (frequencyId === 'yearly') {
        if (nisaPrincipal < NISA_LIMIT) {
          const space = NISA_LIMIT - nisaPrincipal;
          addedToNisaThisYear = Math.min(P, space);
          addedToTaxableThisYear = P - addedToNisaThisYear;
        } else {
          addedToTaxableThisYear = P;
        }
        nisaPrincipal += addedToNisaThisYear;
        taxablePrincipal += addedToTaxableThisYear;

        savingsNisaYearEnd = savingsNisaYearStart * (1 + r_annual) + addedToNisaThisYear;
        savingsTaxableYearEnd = savingsTaxableYearStart * (1 + r_annual) + addedToTaxableThisYear;
      } else {
        for (let step = 1; step <= stepsInYear; step++) {
          let stepAddedToNisa = 0;
          let stepAddedToTaxable = 0;

          if (nisaPrincipal < NISA_LIMIT) {
            const space = NISA_LIMIT - nisaPrincipal;
            stepAddedToNisa = Math.min(P, space);
            stepAddedToTaxable = P - stepAddedToNisa;
          } else {
            stepAddedToTaxable = P;
          }
          nisaPrincipal += stepAddedToNisa;
          taxablePrincipal += stepAddedToTaxable;
          addedToNisaThisYear += stepAddedToNisa;
          addedToTaxableThisYear += stepAddedToTaxable;

          savingsNisaYearEnd = savingsNisaYearEnd * (1 + r_period) + stepAddedToNisa;
          savingsTaxableYearEnd = savingsTaxableYearEnd * (1 + r_period) + stepAddedToTaxable;
        }
      }

      // NISA側積立の成長（非課税）
      savingsNisaValue = savingsNisaYearEnd;

      // 特定口座側積立の成長（年次で20%課税）
      const savingsTaxableGain = savingsTaxableYearEnd - savingsTaxableYearStart - addedToTaxableThisYear;
      const savingsTaxableTax = savingsTaxableGain > 0 ? savingsTaxableGain * 0.20 : 0;
      savingsTaxableValue = savingsTaxableYearEnd - savingsTaxableTax;

      // --- ③ 合算 ---
      const totalValue = nisaAssetGrowth + taxableAssetGrowth + savingsNisaValue + savingsTaxableValue;
      const totalPrincipal = nisaPrincipal + taxablePrincipal;

      yearlyBreakdown.push({
        year,
        value: Math.round(totalValue),
        gain: Math.round(totalValue - totalPrincipal),
        principalAccum: Math.round(totalPrincipal),
        assetGrowth: Math.round(nisaAssetGrowth + taxableAssetGrowth),
        nisaAssetGrowth,
        taxableAssetGrowth,
      });
    }
  }

  const lastYear = yearlyBreakdown[yearlyBreakdown.length - 1];
  const futureValue = lastYear.value;
  const principalTotal = lastYear.principalAccum;
  const totalGain = lastYear.gain;
  const gainRate = principalTotal > 0 ? ((futureValue - principalTotal) / principalTotal) * 100 : 0;

  return {
    yearlyBreakdown,
    futureValue,
    totalGain,
    principalTotal,
    gainRate: Math.round(gainRate * 10) / 10,
  };
};
