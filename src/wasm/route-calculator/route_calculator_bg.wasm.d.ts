/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
<<<<<<< HEAD
export const find_route: (a: number, b: number, c: number, d: number) => [number, number, number];
export const get_all_routes: () => [number, number, number];
export const get_route_by_id: (a: number, b: number) => [number, number, number];
export const load_catalog: (a: number, b: number) => [number, number];
export const load_stops_data: (a: any) => [number, number];
=======
export const analyze_gap: (a: number, b: number, c: number, d: number) => [number, number, number];
export const calculate_route: (a: number, b: number, c: number, d: number, e: any) => [number, number, number];
export const calculate_trip_cost: (a: number, b: number, c: number) => [number, number, number];
export const find_nearest_stop: (a: number, b: number) => [number, number, number];
export const find_route: (a: number, b: number, c: number, d: number) => [number, number, number];
export const get_all_routes: () => [number, number, number];
export const load_stops_data: (a: any) => void;
>>>>>>> security/ffi-hardening-2939308447874549092
export const validate_operator_funds: (a: number) => number;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
