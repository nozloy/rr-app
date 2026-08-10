type CharacterPreference = {
  id: string;
  isActive: boolean;
  itemLevel: number;
  name: string;
};

function compareCharacters(
  left: CharacterPreference,
  right: CharacterPreference,
) {
  if (left.isActive !== right.isActive) {
    return left.isActive ? -1 : 1;
  }

  if (left.itemLevel !== right.itemLevel) {
    return right.itemLevel - left.itemLevel;
  }

  return left.name.localeCompare(right.name);
}

export function getPreferredCharacter<T extends CharacterPreference>(
  characters: T[],
  mainCharacterId?: string | null,
) {
  const selectedCharacter = mainCharacterId
    ? characters.find(
        (character) =>
          character.id === mainCharacterId && character.isActive,
      )
    : null;

  if (selectedCharacter) {
    return selectedCharacter;
  }

  return [...characters].sort(compareCharacters)[0] ?? null;
}

export function orderCharactersByPreference<T extends CharacterPreference>(
  characters: T[],
  mainCharacterId?: string | null,
) {
  return [...characters].sort((left, right) => {
    if (left.id === mainCharacterId && left.isActive) {
      return -1;
    }

    if (right.id === mainCharacterId && right.isActive) {
      return 1;
    }

    return compareCharacters(left, right);
  });
}
