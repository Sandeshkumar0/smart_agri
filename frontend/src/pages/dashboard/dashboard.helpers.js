/* This file keeps Dashboard page helper logic separated for easier debugging and maintenance. */

export const parseAreaToAcres = (areaText) => {
  if (!areaText) {
    return 0;
  }

  const parsed = Number.parseFloat(String(areaText).replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getInitialCropEntries = (fields = []) => {
  const totals = fields.reduce((acc, field) => {
    const cropName = field.crop?.trim();
    if (!cropName) {
      return acc;
    }

    const currentAcre = acc.get(cropName) || 0;
    acc.set(cropName, currentAcre + parseAreaToAcres(field.area));
    return acc;
  }, new Map());

  return Array.from(totals.entries()).map(([name, acres]) => ({
    name,
    acres: Number(acres.toFixed(2)),
    sowingDate: "",
    lastSeasonCrop: "",
  }));
};

export const buildAlertToShow = (shouldPaginateCriticalAlerts, currentCriticalAlert, latestAlert) => (
  shouldPaginateCriticalAlerts && currentCriticalAlert
    ? {
        level: "red",
        message: currentCriticalAlert.message,
        whatToDo: `${currentCriticalAlert.field} • ${currentCriticalAlert.time}`,
      }
    : latestAlert
);

export const buildStatsItems = ({
  alertsLength,
  cropEntries,
  totalCropAcre,
  scanStats = {},
}) => [
  {
    iconText: "SP",
    iconTone: "green",
    label: "Active Crops",
    value: `${cropEntries.length}`,
    sub:
      cropEntries.length > 0
        ? `${totalCropAcre.toFixed(1)} ac total`
        : "Crop onboarding pending",
    trend: 12,
  },
  {
    iconText: "TR",
    iconTone: "blue",
    label: "Avg Yield Score",
    value: "72%",
    sub: "Up from 64% last season",
    trend: 8,
  },
  {
    iconText: "WA",
    iconTone: "mint",
    label: "Water Saved",
    value: cropEntries.length > 0 ? "31%" : "0%",
    sub: cropEntries.length > 0 ? "vs traditional irrigation" : "Add crops to unlock estimate",
    trend: cropEntries.length > 0 ? 31 : 0,
  },
  {
    iconText: "AL",
    iconTone: "orange",
    label: "Active Alerts",
    value: `${alertsLength}`,
    sub: "1 critical, 1 warning",
  },
  {
    iconText: "AI",
    iconTone: "purple",
    label: "AI Accuracy",
    value: scanStats?.totalScans > 0 ? "94%" : "N/A",
    sub:
      scanStats?.totalScans > 0
        ? `${scanStats.totalScans} scans tracked`
        : "Add Crop Doctor scans",
    trend: scanStats?.totalScans > 0 ? 2 : 0,
  },
];
