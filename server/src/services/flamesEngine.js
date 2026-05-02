const meanings = {
  F: "Friends",
  L: "Love",
  A: "Affection",
  M: "Marriage",
  E: "Enemies",
  S: "Siblings"
};

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function calculateFlames(name1, name2) {
  const first = normalizeName(name1);
  const second = normalizeName(name2);

  if (!first || !second) {
    const error = new Error("Both names must include letters.");
    error.status = 400;
    throw error;
  }

  const counts = new Map();
  for (const char of first) counts.set(char, (counts.get(char) || 0) + 1);
  for (const char of second) counts.set(char, (counts.get(char) || 0) - 1);

  const remainingCount = [...counts.values()].reduce((total, value) => total + Math.abs(value), 0);
  const count = remainingCount || first.length + second.length;
  const letters = ["F", "L", "A", "M", "E", "S"];
  const eliminationSteps = [];
  let index = 0;

  while (letters.length > 1) {
    index = (index + count - 1) % letters.length;
    eliminationSteps.push({
      before: [...letters],
      removed: letters[index],
      index
    });
    letters.splice(index, 1);
  }

  return {
    result: meanings[letters[0]],
    remainingCount,
    eliminationSteps
  };
}
