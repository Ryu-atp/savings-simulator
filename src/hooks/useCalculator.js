/**
 * useCalculator.js - 複利計算の純粋ロジック（v2.2）
 *
 * 計算式:
 *   一括投資: A = P * (1 + r/100)^n
 *   積立投資: FV = PMT * [(1 + r_period)^n_periods - 1] / r_period
 *
 *   A   : 将来価値（Future Value）
 *   P   : 節約額（Principal）
 *   PMT : 1回あたりの積立額
 *   r   : 年利（Rate, %）
 *   n   : 運用年数（Years）
 *
 * 投資先プリセット（v2.1 日本語名称）:
 *   米国株 (S&P500)          : 平均上昇率 13%
 *   全世界株 (オール・カントリー): 平均上昇率 11.5%
 *
 * このフックは副作用を持たない純粋な計算ロジックのみを提供する。
 */

import { useState, useCallback } from 'react';

// ─── 投資先プリセット定数 ─────────────────────────────────
export const INVESTMENT_PRESETS = [
  {
    id: 'sp500',
    label: '米国株 (S&P500)',
    sublabel: 'S&P500',
    rate: 13,
    emoji: '🇺🇸',
    description: '過去30年の平均年利約13%',
    note: '※過去30年の平均利率',
  },
  {
    id: 'allcountry',
    label: '全世界株 (オール・カントリー)',
    sublabel: 'オルカン',
    rate: 11.5,
    emoji: '🌍',
    description: '過去30年の平均年利約11.5%',
    note: '※過去30年の平均利率',
  },
];

// ─── 積立頻度定数 ──────────────────────────────────────────
export const FREQUENCY_OPTIONS = [
  { id: 'monthly', label: '毎月', periodsPerYear: 12 },
  { id: 'weekly',  label: '毎週', periodsPerYear: 52 },
  { id: 'daily',   label: '毎日', periodsPerYear: 365 },
  { id: 'yearly',  label: '毎年', periodsPerYear: 1 },
];

// ─── デフォルト入力値 ────────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  principal: '',          // 節約額 or 1回あたりの積立額（円）
  years: '',              // 運用年数
  presetId: 'sp500',      // デフォルト: 米国株
  frequencyId: 'monthly', // デフォルト: 毎月積立
  annualRate: '13',       // 想定年利（%）: デフォルトの米国株プリセットに合わせて13
};

// ─── ユーティリティ ──────────────────────────────────────────────────────────

/**
 * 数値を日本円フォーマットに変換
 * @param {number} value
 * @returns {string} 例: 1,234,567
 */
export const formatJPY = (value) => {
  if (isNaN(value) || value === null) return '0';
  return Math.round(value).toLocaleString('ja-JP');
};

/**
 * 汎用・短縮表示
 * @param {number} value
 * @returns {string} 例: "約123万円"
 */
export const formatShort = (value) => {
  if (value >= 100_000_000) {
    return `約${(value / 100_000_000).toFixed(1)}億円`;
  }
  if (value >= 10_000) {
    return `約${Math.round(value / 10_000)}万円`;
  }
  return `${formatJPY(value)}円`;
};

// ─── フック本体 ──────────────────────────────────────────────────────────────
const useCalculator = () => {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  // ── 入力値の更新 ──────────────────────────────────────────────────────────
  const updateInput = useCallback((field, value) => {
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      
      if (field === 'annualRate') {
        // 想定年利が手動入力で変更された場合、プリセット選択をクリア
        next.presetId = null;
      }
      
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: null, rate: null }));
  }, []);

  // ── プリセット選択（annualRate に金利を直接代入） ────────────────────────────
  const selectPreset = useCallback((presetId) => {
    const preset = INVESTMENT_PRESETS.find((p) => p.id === presetId);
    setInputs((prev) => ({
      ...prev,
      presetId,
      annualRate: preset ? String(preset.rate) : prev.annualRate,
    }));
    setResult(null);
  }, []);

  // ── 積立頻度選択 ──────────────────────────────────────────────────────────
  const selectFrequency = useCallback((frequencyId) => {
    setInputs((prev) => ({ ...prev, frequencyId }));
    setResult(null);
  }, []);

  // ── バリデーション ────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const newErrors = {};
    const p = parseFloat(inputs.principal);
    const n = parseFloat(inputs.years);
    const r = parseFloat(inputs.annualRate);

    if (!inputs.principal || isNaN(p) || p <= 0) {
      newErrors.principal = '金額を入力してください（1円以上）';
    } else if (p > 100_000_000_000) {
      newErrors.principal = '入力可能な上限は1,000億円です';
    }

    if (!inputs.years || isNaN(n) || n <= 0) {
      newErrors.years = '運用年数を入力してください（1年以上）';
    } else if (!Number.isInteger(n) || n > 50) {
      newErrors.years = '運用年数は1〜50年の整数で入力してください';
    }

    if (!inputs.annualRate || isNaN(r)) {
      newErrors.annualRate = '想定年利を入力してください';
    } else if (r < 0 || r > 50) {
      newErrors.annualRate = '年利は0〜50%で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [inputs]);

  // ── 計算実行 ────────────────
  /**
   * 複利計算を実行し、結果をstateに保存する
   * @param {number} currentAsset - 現在の資産額
   * @returns {Object|null} 計算結果、バリデーション失敗時はnull
   */
  const calculate = useCallback((currentAsset = 0) => {
    if (!validate()) return null;

    const P = parseFloat(inputs.principal);
    const n = parseFloat(inputs.years);
    const preset = INVESTMENT_PRESETS.find((p) => p.id === inputs.presetId);
    const freqOpt = FREQUENCY_OPTIONS.find((f) => f.id === inputs.frequencyId) ?? FREQUENCY_OPTIONS[0];

    const r = parseFloat(inputs.annualRate);
    const r_annual = r / 100;

    // ── 年次ブレイクダウン ──
    const yearlyBreakdown = [];

    // 0年目（初期値）を追加
    yearlyBreakdown.push({
      year: 0,
      value: currentAsset,
      gain: 0,
      principalAccum: currentAsset,
      assetGrowth: currentAsset,
    });

    // 既存の月次複利等のロジック（常時適用）
    if (freqOpt.id === 'yearly') {
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
      const periodsPerYear = freqOpt.periodsPerYear;
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

    // 最終年の値
    const lastYear = yearlyBreakdown[yearlyBreakdown.length - 1];
    const futureValue = lastYear.value;
    const totalGain = lastYear.gain;
    const principalTotal = lastYear.principalAccum;
    const gainRate = principalTotal > 0 ? ((futureValue - principalTotal) / principalTotal) * 100 : 0;

    const calculatedResult = {
      currentAsset,
      principal: P,
      principalTotal: Math.round(principalTotal),
      futureValue: Math.round(futureValue),
      totalGain: Math.round(totalGain),
      gainRate: Math.round(gainRate * 10) / 10,
      annualRate: Math.round(r * 1000) / 1000,
      years: n,
      presetId: inputs.presetId,
      presetLabel: preset?.label ?? '',
      frequencyId: freqOpt.id,
      frequencyLabel: freqOpt.label,
      calculationType: 'annualRate',
      originalAnnualRate: inputs.annualRate,
      yearlyBreakdown,
      calculatedAt: new Date().toISOString(),
    };

    setResult(calculatedResult);
    return calculatedResult;
  }, [inputs, validate]);

  // ── リセット ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setResult(null);
    setErrors({});
  }, []);

  return {
    inputs,
    result,
    errors,
    updateInput,
    selectPreset,
    selectFrequency,
    calculate,
    reset,
    INVESTMENT_PRESETS,
    FREQUENCY_OPTIONS,
  };
};

export default useCalculator;
