export const CAMERA_STOP_IDS = [
  "exterior",
  "access",
  "tunnel",
  "field",
  "popular",
  "platea",
] as const;

export type CameraStopId = (typeof CAMERA_STOP_IDS)[number];

export type CameraStop = {
  id: CameraStopId;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  hotspot: readonly [number, number, number];
};

export const CAMERA_STOPS: readonly CameraStop[] = [
  {
    id: "exterior",
    position: [150, 68, 122],
    target: [0, 14, 8],
    hotspot: [110, 1.2, 84],
  },
  {
    id: "access",
    position: [-190, 22, -80],
    target: [-105, 9, -10],
    hotspot: [-109, 1.2, -8],
  },
  {
    id: "tunnel",
    position: [-50, 2.45, -19],
    target: [-12, 2.35, 7],
    hotspot: [-48, 0.75, -20],
  },
  {
    id: "field",
    position: [42, 3.2, 6],
    target: [0, 3.2, 0],
    hotspot: [0, 0.68, 0],
  },
  {
    id: "popular",
    position: [0, 27, 53],
    target: [0, 13, -34],
    hotspot: [0, 22, 50],
  },
  {
    id: "platea",
    position: [41, 18, -35],
    target: [5, 13, 47],
    hotspot: [37, 14, -34],
  },
] as const;

export const CAMERA_STOP_BY_ID = new Map(
  CAMERA_STOPS.map((stop) => [stop.id, stop]),
);
