const ATOM_PARAM_RULES_KEY = 'atomParamRules'

export function resolveEffectiveAtomParams({ atomType, params, config }) {
  const cfg = config || {}
  const resolved = { ...(params || {}) }

  for (const [key, cfgVal] of Object.entries(cfg)) {
    if (key !== ATOM_PARAM_RULES_KEY &&
        cfgVal !== null && cfgVal !== undefined &&
        resolved[key] === null) {
      resolved[key] = cfgVal
    }
  }

  const atomRules = cfg[ATOM_PARAM_RULES_KEY]?.[atomType] || {}
  for (const [paramKey, rule] of Object.entries(atomRules)) {
    if (paramKey === 'rows' && Array.isArray(rule?.fixedValue) && rule.fixedValue.length) {
      resolved[paramKey] = rule.fixedValue
      continue
    }
    if (rule?.fixedEnabled && Object.prototype.hasOwnProperty.call(rule, 'fixedValue')) {
      resolved[paramKey] = rule.fixedValue
    }
  }

  return resolved
}
