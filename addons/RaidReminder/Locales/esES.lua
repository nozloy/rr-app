local locales = RaidReminderLocales
if not locales then
  return
end

local whisper = {
  whisperMissingEnchants = "Faltan encantamientos",
  whisperMissingGems = "Ranuras vacías",
  whisperNoIssues = "No se encontraron encantamientos ni gemas faltantes.",
  whisperPrefix = "Comprobación de RaidReminder:",
  slotBack = "Espalda",
  slotChest = "Pecho",
  slotFeet = "Pies",
  slotFinger1 = "Anillo 1",
  slotFinger2 = "Anillo 2",
  slotHands = "Manos",
  slotHead = "Cabeza",
  slotLegs = "Piernas",
  slotMainHand = "Mano principal",
  slotNeck = "Cuello",
  slotOffHand = "Mano izquierda",
  slotShoulder = "Hombros",
  slotTrinket1 = "Abalorio 1",
  slotTrinket2 = "Abalorio 2",
  slotWaist = "Cintura",
  slotWrist = "Muñecas",
}

locales.whisper.esES = whisper
