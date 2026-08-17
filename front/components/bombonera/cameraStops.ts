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
    position: [142, 66, 132],
    target: [0, 10, 10],
    hotspot: [102, 1.2, 81],
  },
  {
    id: "access",
    position: [-140, 11, -6],
    target: [-97, 4.5, -5],
    hotspot: [-104, 1.2, -5],
  },
  {
    id: "tunnel",
    position: [0, 2.4, -49],
    target: [0, 2, -8],
    hotspot: [0, 0.75, -43],
  },
  {
    id: "field",
    position: [30, 5.4, 8],
    target: [-8, 3.2, 4],
    hotspot: [0, 0.68, 0],
  },
  {
    id: "popular",
    position: [0, 27, 58],
    target: [0, 2.5, 2],
    hotspot: [0, 18.5, 52],
  },
  {
    id: "platea",
    position: [18, 21, -31],
    target: [0, 2.5, 8],
    hotspot: [18, 15, -33],
  },
] as const;

export const CAMERA_STOP_BY_ID = new Map(
  CAMERA_STOPS.map((stop) => [stop.id, stop]),
);
