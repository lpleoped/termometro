/**
 * AI Budget Presets Tests
 * 
 * Verifies:
 * - Preset mapping to concrete limits
 * - Enforcement of selected preset
 * - Default preset behavior
 * - Validation of preset values
 */

import assert from 'node:assert';
import { AI_BUDGET_PRESETS, DEFAULT_PRESET, getBudgetLimits, getPresetInfo, isValidPreset } from './services/ai-budget-presets';
import type { AIBudgetPreset } from '@termometro/shared';

// Test 1: All presets exist and have required fields
const testPresetCompleteness = () => {
  const requiredPresets: AIBudgetPreset[] = ['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite'];
  
  for (const preset of requiredPresets) {
    assert.ok(preset in AI_BUDGET_PRESETS, `Preset "${preset}" must exist`);
    
    const info = AI_BUDGET_PRESETS[preset];
    assert.ok(typeof info.name === 'string' && info.name.length > 0, `${preset}: name required`);
    assert.ok(typeof info.description === 'string' && info.description.length > 0, `${preset}: description required`);
    assert.ok(typeof info.costWarning === 'string' && info.costWarning.length > 0, `${preset}: costWarning required`);
    assert.ok(typeof info.maxQuestionnaireInput === 'number' && info.maxQuestionnaireInput > 0, `${preset}: maxQuestionnaireInput required`);
    assert.ok(typeof info.maxQualitativeText === 'number' && info.maxQualitativeText > 0, `${preset}: maxQualitativeText required`);
    assert.ok(typeof info.maxContextChars === 'number' && info.maxContextChars > 0, `${preset}: maxContextChars required`);
    assert.ok(typeof info.maxAnalysesPerHour === 'number' && info.maxAnalysesPerHour > 0, `${preset}: maxAnalysesPerHour required`);
    assert.ok(typeof info.maxInputTokens === 'number' && info.maxInputTokens > 0, `${preset}: maxInputTokens required`);
    assert.ok(typeof info.maxOutputTokens === 'number' && info.maxOutputTokens > 0, `${preset}: maxOutputTokens required`);
  }
};

testPresetCompleteness();
console.log('✓ Test 1: All presets exist with required fields');

// Test 2: Preset limits are strictly increasing
const testLimitsIncreasing = () => {
  const presets: AIBudgetPreset[] = ['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite'];
  
  for (let i = 1; i < presets.length; i++) {
    const prev = AI_BUDGET_PRESETS[presets[i - 1]];
    const curr = AI_BUDGET_PRESETS[presets[i]];
    
    assert.ok(curr.maxQuestionnaireInput > prev.maxQuestionnaireInput, `${presets[i]}.maxQuestionnaireInput should be > ${presets[i-1]}`);
    assert.ok(curr.maxQualitativeText > prev.maxQualitativeText, `${presets[i]}.maxQualitativeText should be > ${presets[i-1]}`);
    assert.ok(curr.maxContextChars > prev.maxContextChars, `${presets[i]}.maxContextChars should be > ${presets[i-1]}`);
    assert.ok(curr.maxAnalysesPerHour > prev.maxAnalysesPerHour, `${presets[i]}.maxAnalysesPerHour should be > ${presets[i-1]}`);
    assert.ok(curr.maxInputTokens > prev.maxInputTokens, `${presets[i]}.maxInputTokens should be > ${presets[i-1]}`);
    assert.ok(curr.maxOutputTokens > prev.maxOutputTokens, `${presets[i]}.maxOutputTokens should be > ${presets[i-1]}`);
  }
};

testLimitsIncreasing();
console.log('✓ Test 2: Limits are strictly increasing across presets');

// Test 3: Default preset is valid and sensible
const testDefaultPreset = () => {
  assert.strictEqual(DEFAULT_PRESET, 'estándar', 'Default should be "estándar"');
  assert.ok(DEFAULT_PRESET in AI_BUDGET_PRESETS, 'Default preset must exist');
  
  const defaultLimits = getBudgetLimits();
  assert.strictEqual(defaultLimits.maxQuestionnaireInput, 24000, 'Default questionnaire input limit');
  assert.strictEqual(defaultLimits.maxQualitativeText, 4000, 'Default qualitative text limit');
  assert.strictEqual(defaultLimits.maxContextChars, 32000, 'Default context chars limit');
  assert.strictEqual(defaultLimits.maxAnalysesPerHour, 20, 'Default analyses per hour limit');
};

testDefaultPreset();
console.log('✓ Test 3: Default preset is valid and sensible');

// Test 4: getBudgetLimits() correctly resolves presets
const testGetBudgetLimits = () => {
  const pequeño = getBudgetLimits('pequeño');
  assert.strictEqual(pequeño.maxQuestionnaireInput, 8000);
  assert.strictEqual(pequeño.maxQualitativeText, 1500);
  
  const grande = getBudgetLimits('grande');
  assert.strictEqual(grande.maxQuestionnaireInput, 60000);
  assert.strictEqual(grande.maxQualitativeText, 8000);
  
  const sinLimite = getBudgetLimits('sin-límite');
  assert.strictEqual(sinLimite.maxQuestionnaireInput, 500000);
  assert.strictEqual(sinLimite.maxQualitativeText, 50000);
  assert.strictEqual(sinLimite.maxContextChars, 1000000);
  
  // Falls back to default when undefined
  const fallback = getBudgetLimits(undefined);
  assert.strictEqual(fallback.maxQuestionnaireInput, 24000);
};

testGetBudgetLimits();
console.log('✓ Test 4: getBudgetLimits() correctly resolves presets');

// Test 5: isValidPreset() validation
const testIsValidPreset = () => {
  assert.strictEqual(isValidPreset('pequeño'), true);
  assert.strictEqual(isValidPreset('estándar'), true);
  assert.strictEqual(isValidPreset('grande'), true);
  assert.strictEqual(isValidPreset('muy-grande'), true);
  assert.strictEqual(isValidPreset('sin-límite'), true);
  
  assert.strictEqual(isValidPreset('invalid'), false);
  assert.strictEqual(isValidPreset(''), false);
  assert.strictEqual(isValidPreset(null), false);
  assert.strictEqual(isValidPreset(undefined), false);
  assert.strictEqual(isValidPreset(123), false);
  assert.strictEqual(isValidPreset({}), false);
};

testIsValidPreset();
console.log('✓ Test 5: isValidPreset() validates correctly');

// Test 6: getPresetInfo() returns complete info
const testGetPresetInfo = () => {
  const info = getPresetInfo('muy-grande');
  assert.strictEqual(info.name, 'Muy grande');
  assert.ok(info.description.length > 0);
  assert.ok(info.costWarning.length > 0);
  assert.ok(info.estimatedCostPerAnalysis);
  assert.ok(info.estimatedCostPerAnalysis.min > 0);
  assert.ok(info.estimatedCostPerAnalysis.max > info.estimatedCostPerAnalysis.min);
  assert.strictEqual(info.estimatedCostPerAnalysis.currency, 'USD');
};

testGetPresetInfo();
console.log('✓ Test 6: getPresetInfo() returns complete information');

// Test 7: "sin-límite" has appropriate warnings
const testSinLimiteWarnings = () => {
  const sinLimite = getPresetInfo('sin-límite');
  assert.ok(sinLimite.costWarning.includes('ADVERTENCIA'), 'Must have explicit warning');
  assert.ok(sinLimite.costWarning.includes('⚠️'), 'Must have warning emoji');
  assert.ok(sinLimite.costWarning.includes('elevado'), 'Must mention high cost');
  
  // Ensure limits are truly high
  assert.ok(sinLimite.maxQuestionnaireInput >= 500000, 'Very high questionnaire input limit');
  assert.ok(sinLimite.maxQualitativeText >= 50000, 'Very high qualitative text limit');
  assert.ok(sinLimite.maxContextChars >= 1000000, 'Very high context limit');
  assert.ok(sinLimite.maxAnalysesPerHour >= 200, 'Very high rate limit');
};

testSinLimiteWarnings();
console.log('✓ Test 7: "sin-límite" has appropriate warnings');

// Test 8: Cost estimates are reasonable and increasing
const testCostEstimates = () => {
  const presets: AIBudgetPreset[] = ['pequeño', 'estándar', 'grande', 'muy-grande', 'sin-límite'];
  
  for (let i = 1; i < presets.length; i++) {
    const prev = getPresetInfo(presets[i - 1]);
    const curr = getPresetInfo(presets[i]);
    
    if (prev.estimatedCostPerAnalysis && curr.estimatedCostPerAnalysis) {
      assert.ok(curr.estimatedCostPerAnalysis.min >= prev.estimatedCostPerAnalysis.min, 
        `${presets[i]} min cost should be >= ${presets[i-1]} min cost`);
      assert.ok(curr.estimatedCostPerAnalysis.max >= prev.estimatedCostPerAnalysis.max,
        `${presets[i]} max cost should be >= ${presets[i-1]} max cost`);
    }
  }
};

testCostEstimates();
console.log('✓ Test 8: Cost estimates are reasonable and increasing');

// Test 9: Env var override works
const testEnvVarOverride = () => {
  const originalEnv = process.env.AI_MAX_QUESTIONNAIRE_INPUT;
  
  process.env.AI_MAX_QUESTIONNAIRE_INPUT = '99999';
  const limits = getBudgetLimits('pequeño'); // Should override pequeño's 8000
  assert.strictEqual(limits.maxQuestionnaireInput, 99999, 'Env var should override preset');
  
  // Cleanup
  if (originalEnv) process.env.AI_MAX_QUESTIONNAIRE_INPUT = originalEnv;
  else delete process.env.AI_MAX_QUESTIONNAIRE_INPUT;
};

testEnvVarOverride();
console.log('✓ Test 9: Env var override works');

// Test 10: Token limits are reasonable relative to character limits
const testTokenCharacterAlignment = () => {
  // Rough heuristic: 1 token ≈ 2-4 characters in Spanish/English
  // We define tokens conservatively (lower bound) to avoid over-budget
  for (const preset of Object.keys(AI_BUDGET_PRESETS) as AIBudgetPreset[]) {
    const info = AI_BUDGET_PRESETS[preset];
    const estimatedCharsFromTokens = info.maxInputTokens * 4; // upper bound (1 token = 4 chars)
    const actualChars = info.maxQuestionnaireInput;
    
    // Tokens should be roughly half of character limits (conservative approach)
    // Ratio of 2.0 means 1 token ≈ 2 chars (conservative)
    // Ratio of 4.0 means 1 token ≈ 4 chars (generous)
    const ratio = estimatedCharsFromTokens / actualChars;
    assert.ok(ratio >= 0.5 && ratio <= 4.5, 
      `${preset}: token/char ratio ${ratio.toFixed(2)} should be between 0.5 and 4.5 (conservative token budget)`);
    
    // Token limits should be increasing
    assert.ok(info.maxInputTokens > 0, `${preset}: maxInputTokens must be positive`);
    assert.ok(info.maxOutputTokens > 0, `${preset}: maxOutputTokens must be positive`);
  }
};

testTokenCharacterAlignment();
console.log('✓ Test 10: Token limits are reasonable and conservative');

console.log('\n✅ All AI budget preset tests passed');
