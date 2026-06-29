// Validation logic ported from the Problem-Based SRS Navigator
// Validates specification JSON against expected schema and reference integrity

const ID_PATTERNS = {
  problem: /^(CP|P)-\d+$/,
  need: /^(CN|N)-\d+$/,
  fr: /^FR-\d+$/,
  nfr: /^NFR-\d+$/
};

/**
 * Validate a specification JSON object against the expected schema
 */
export function validateSpecificationJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { success: false, errors: ['Input must be a non-null object'] };
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name: Specification name is required');
  } else if (data.name.length > 300) {
    errors.push('name: Must be at most 300 characters');
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('description: Must be a string');
  }

  if (!data.version || typeof data.version !== 'string') {
    errors.push('version: Version is required');
  } else if (!/^\d+\.\d+(\.\d+)?$/.test(data.version)) {
    errors.push('version: Must be in format X.Y or X.Y.Z');
  }

  const validateArray = (arr, name, idPattern, label) => {
    if (!Array.isArray(arr)) {
      errors.push(`${name}: Must be an array`);
      return [];
    }
    if (arr.length > 1000) {
      errors.push(`${name}: Must have at most 1000 items`);
    }
    const validated = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== 'object') {
        errors.push(`${name}[${i}]: Must be an object`);
        continue;
      }
      if (!item.id || typeof item.id !== 'string') {
        errors.push(`${name}[${i}].id: ID is required`);
      } else if (!idPattern.test(item.id)) {
        errors.push(`${name}[${i}].id: ${label} ID must match format (got "${item.id}")`);
      }
      if (!item.title || typeof item.title !== 'string') {
        errors.push(`${name}[${i}].title: Title is required`);
      } else if (item.title.length > 300) {
        errors.push(`${name}[${i}].title: Must be at most 300 characters`);
      }
      if (!item.description || typeof item.description !== 'string') {
        errors.push(`${name}[${i}].description: Description is required`);
      } else if (item.description.length > 10000) {
        errors.push(`${name}[${i}].description: Must be at most 10000 characters`);
      }
      validated.push(item);
    }
    return validated;
  };

  const problems = validateArray(data.problems || [], 'problems', ID_PATTERNS.problem, 'Problem (CP-X or P-X)');
  const needs = validateArray(data.needs || [], 'needs', ID_PATTERNS.need, 'Need (CN-X or N-X)');
  const functionalRequirements = validateArray(data.functionalRequirements || [], 'functionalRequirements', ID_PATTERNS.fr, 'FR (FR-X)');
  const nonFunctionalRequirements = validateArray(data.nonFunctionalRequirements || [], 'nonFunctionalRequirements', ID_PATTERNS.nfr, 'NFR (NFR-X)');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: data.name,
      description: data.description || '',
      version: data.version,
      problems,
      needs: needs.map(n => ({ ...n, problemIds: Array.isArray(n.problemIds) ? n.problemIds : [] })),
      functionalRequirements: functionalRequirements.map(fr => ({ ...fr, needIds: Array.isArray(fr.needIds) ? fr.needIds : [] })),
      nonFunctionalRequirements: nonFunctionalRequirements.map(nfr => ({ ...nfr, needIds: Array.isArray(nfr.needIds) ? nfr.needIds : [] }))
    }
  };
}

/**
 * Validate reference integrity (all referenced IDs exist)
 */
export function validateReferenceIntegrity(spec) {
  const errors = [];
  const problemIds = new Set((spec.problems || []).map(p => p.id));
  const needIds = new Set((spec.needs || []).map(n => n.id));

  for (const need of (spec.needs || [])) {
    for (const problemId of (need.problemIds || [])) {
      if (!problemIds.has(problemId)) {
        errors.push(`Need ${need.id} references non-existent problem ${problemId}`);
      }
    }
  }

  for (const fr of (spec.functionalRequirements || [])) {
    for (const needId of (fr.needIds || [])) {
      if (!needIds.has(needId)) {
        errors.push(`FR ${fr.id} references non-existent need ${needId}`);
      }
    }
  }

  for (const nfr of (spec.nonFunctionalRequirements || [])) {
    for (const needId of (nfr.needIds || [])) {
      if (!needIds.has(needId)) {
        errors.push(`NFR ${nfr.id} references non-existent need ${needId}`);
      }
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
