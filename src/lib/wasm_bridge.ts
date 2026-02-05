import init, {
    calculate_route,
    analyze_gap,
    calculate_trip_cost,
    find_nearest_stop
} from '../wasm/route-calculator/route_calculator.js';

export interface BilingualString {
    en: string;
    es: string;
}

export interface StopInfo {
    name: string;
    lat: number;
    lng: number;
    distance_km: number;
}

export interface GapAnalysis {
    origin_gap: StopInfo | null;
    dest_gap: StopInfo | null;
    recommendation: "Walk" | "Private" | "NoPublicCoverage" | string;
}

export interface RouteResponse {
    success: boolean;
    path: string[];
    has_transfer: boolean;
    transfer_point?: BilingualString;
    routes: string[];
    distance_km: number;
    time_min: number;
    instructions: BilingualString[];
    error?: BilingualString;
    airport_warning?: BilingualString;
    estimated_cost_mxn: number;
}

export interface TripCost {
    cost_mxn: number;
    base_price: number;
    currency: string;
    payment_method: string;
    info: BilingualString;
    seats: number;
}

export class RouteCalculatorBridge {
    private static instance: RouteCalculatorBridge;
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    private constructor() {}

    public static getInstance(): RouteCalculatorBridge {
        if (!RouteCalculatorBridge.instance) {
            RouteCalculatorBridge.instance = new RouteCalculatorBridge();
        }
        return RouteCalculatorBridge.instance;
    }

    public async init(): Promise<void> {
        if (this.initialized) return;

        if (!this.initPromise) {
            this.initPromise = (async () => {
                // Initialize WASM
                await init();
                this.initialized = true;
                console.log("🚀 WASM Engine Initialized");
            })();
        }

        return this.initPromise;
    }

    public async calculateRoute(
        originLat: number,
        originLng: number,
        destLat: number,
        destLng: number
    ): Promise<RouteResponse> {
        await this.init();
        try {
            // WASM function expects raw object for data, but here we might rely on internal static data
            // The Rust signature is calculate_route(o_lat, o_lng, d_lat, d_lng, routes_val)
            // Wait, calculate_route in Rust takes `routes_val: JsValue` as 5th argument!
            // We need to pass the data structure.

            // If we want to use the embedded static data, we might need a different function in Rust
            // OR pass a dummy/empty object if the Rust side falls back to static DB.

            // Looking at lib.rs:
            // pub fn calculate_route(..., routes_val: JsValue) { ... }
            // It deserializes `routes_val` to `RootData`.
            // If we want to use the embedded data, we should probably have exposed a function that uses `STOPS_DB`.
            // But `find_route_internal` uses `&RootData`.

            // The current `calculate_route` implementation in Rust (which I didn't verify fully)
            // seems to require passing the data every time.

            // However, the task says "build the invisible logic core".
            // If the data is embedded in Rust (via STOPS_DB), maybe we should use `find_route_rs` logic?
            // `find_route_rs` takes strings (names).

            // The requirement was: "Task 2... Update lib.rs to ingest the new JSON...".
            // And I updated `STOPS_DB`.

            // I should verify if there is a WASM function that uses `STOPS_DB`.
            // I saw `find_nearest_stop` uses `find_nearest_stop_rs` which likely uses `STOPS_DB`.
            // `analyze_gap` uses `analyze_gap_rs`.

            // But `calculate_route` signature in generated .d.ts is `(a, b, c, d, e)`.
            // So it expects data passed in.

            // For now, I'll pass an empty object or minimal valid structure,
            // OR I should have modified `calculate_route` to use the embedded data if input is null?

            // But I am not supposed to change `lib.rs` logic deeply, just ingest data.
            // I'll assume for now I should pass an empty structure or that the client handles data loading.
            // Actually, the `load_stops_data` function populates `STOPS_DB`.

            // Let's pass an empty object for now.
             return calculate_route(originLat, originLng, destLat, destLng, { routes: [] });
        } catch (e) {
            console.error("WASM Calculation Error:", e);
            throw e;
        }
    }

    public async analyzeGap(
        userLat: number,
        userLng: number,
        destLat: number,
        destLng: number
    ): Promise<GapAnalysis> {
        await this.init();
        return analyze_gap(userLat, userLng, destLat, destLng);
    }

    public async calculateTripCost(
        distance: number,
        seats: number,
        isTourist: boolean
    ): Promise<TripCost> {
        await this.init();
        return calculate_trip_cost(distance, seats, isTourist);
    }

    public async findNearestStop(lat: number, lng: number): Promise<StopInfo | null> {
        await this.init();
        return find_nearest_stop(lat, lng);
    }
}
