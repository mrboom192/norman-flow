// Wording for confirmation dialogs, kept in one place so the team can edit it.
export const dialogs = {
  resetMap: {
    title: "Are you sure you want to reset your map?",
    body: "You cannot undo this change. Doing this will delete all added data from the maps and V/C ratios. Only the base data will remain.",
    confirm: "Reset",
  },
  resetAliases: {
    title: "Reset column aliases?",
    body: "Doing this will reset all custom column aliases to their default names.",
    confirm: "Reset",
  },
  resetCapacities: {
    title: "Reset capacities?",
    body: "This will replace the values in the editor with the official ACOG capacities. If you have unsaved changes, save them first (Save or Save as new) or they will be lost.",
    saveFirst: "Save first",
    confirm: "Reset",
  },
  deletePreset: {
    title: "Delete this preset?",
    body: "The preset's capacities will be removed from this device. The official rankings are not affected.",
    confirm: "Delete",
  },
} as const;
