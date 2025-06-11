-- Update existing users' preferences to include enabledModels if they don't have it
UPDATE users 
SET preferences = jsonb_set(
  preferences,
  '{ai,enabledModels}',
  '[]'::jsonb,
  true
)
WHERE preferences->'ai'->>'enabledModels' IS NULL
AND preferences->'ai' IS NOT NULL;

-- Update existing users' preferences to include preferredProviders if they don't have it
UPDATE users 
SET preferences = jsonb_set(
  preferences,
  '{ai,preferredProviders}',
  '[]'::jsonb,
  true
)
WHERE preferences->'ai'->>'preferredProviders' IS NULL
AND preferences->'ai' IS NOT NULL;

-- Make existing defaultModel field optional (convert old enum values to strings)
UPDATE users 
SET preferences = jsonb_set(
  preferences,
  '{ai,defaultModel}',
  to_jsonb(preferences->'ai'->>'defaultModel'),
  true
)
WHERE preferences->'ai'->>'defaultModel' IS NOT NULL; 