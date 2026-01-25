export interface CameraWaypoint {
    /** Идентификатор для запуска маршрута по ID */
    id: string;
    /** Угол обзора */
    fov: number;
    coords: { x: number, y: number, z: number, rx: number, ry: number, rz: number, time: number }[];
    /** Эта камера предназначена для загрузочного экрана и будет случайно выбираться для него */
    cameraForLoadScreen?: true;
}

export const CAMERA_WAYPOINTS: CameraWaypoint[] = [
    {
        id: "startcamera1",
        fov: 40,
        coords: [
            { x: 440.17, y: -263.02, z: 71.30, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 424.40, y: -257.15, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera2",
        fov: 43,
        coords: [
            { x: 423.45, y: -260.92, z: 71.25, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 433.35, y: -257.64, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera3",
        fov: 45,
        coords: [
            { x: 427.55, y: -255.09, z: 75.92, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 447.50, y: -268.49, z: 75.92, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera4",
        fov: 33,
        coords: [
            { x: 441.52, y: -264.74, z: 75.53, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 418.80, y: -257.10, z: 75.53, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera5",
        fov: 35,
        coords: [
            { x: 439.70, y: -266.97, z: 71.25, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 442.02, y: -259.62, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },

    {
        id: "startcamera6",
        fov: 40,
        coords: [
            { x: 423.52, y: -258.51, z: 71.25, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 439.80, y: -265.02, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera7",
        fov: 40,
        coords: [
            { x: 428.59, y: -256.19, z: 71.25, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 438.92, y: -260.57, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera8",
        fov: 40,
        coords: [
            { x: 440.38, y: -256.96, z: 75.72, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 428.92, y: -286.70, z: 78.54, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera9",
        fov: 40,
        coords: [
            { x: 440.83, y: -261.11, z: 71.25, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 423.07, y: -259.73, z: 71.25, rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    },
    {
        id: "startcamera10",
        fov: 40,
        coords: [
            { x: 416.40, y: -255.77, z: 79.94, rx: 2.1751081943511963, ry: 1.334983057432737e-8, rz: -5.627867698669434, time: 35000 },
            { x: 439.01, y: -262.94, z: 76.18
                , rx: 0.25984033942222595, ry: 0, rz: 38.14142608642578, time: 0 },
        ], cameraForLoadScreen: true
    }
]