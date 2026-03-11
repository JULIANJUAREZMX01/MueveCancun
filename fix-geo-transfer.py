import re

with open('rust-wasm/route-calculator/src/lib.rs', 'r') as f:
    content = f.read()

pass_2_code = """
            // Pass 2: Geographic proximity match (only if no exact match found)
            if best_transfer.is_none() {
                'geo_search: for (idx_a, stop_a) in route_a.stops.iter().enumerate() {
                    if idx_a == origin_idx_a {
                        continue;
                    }

                    // Skip stops without valid coordinates
                    if stop_a.lat == 0.0 || stop_a.lng == 0.0 {
                        continue;
                    }

                    for (idx_b, stop_b) in route_b.stops.iter().enumerate() {
                        if idx_b == dest_idx_b {
                            continue;
                        }

                        if stop_b.lat == 0.0 || stop_b.lng == 0.0 {
                            continue;
                        }

                        // Check bounding box first for fast rejection (roughly 400m)
                        if (stop_a.lat - stop_b.lat).abs() > 0.004 ||
                           (stop_a.lng - stop_b.lng).abs() > 0.004 {
                            continue;
                        }

                        let dist = haversine_distance_m(stop_a.lat, stop_a.lng, stop_b.lat, stop_b.lng);
                        if dist <= GEO_TRANSFER_RADIUS_M {
                            let is_preferred = PREFERRED_HUBS.iter().any(|h| stop_a.name.contains(h));
                            best_transfer = Some((idx_a, is_preferred, true));
                            break 'geo_search; // Found a valid geo transfer, stop searching
                        }
                    }
                }
            }
"""

# Insert Pass 2 right after Pass 1 loop finishes
insertion_point = "            }"
content = content.replace(
    "            }\n\n            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {",
    f"            }}\n{pass_2_code}\n            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {{"
)

# Fix the unused functions warning while we're at it
content = content.replace("#[allow(dead_code)]", "")
content = content.replace("fn haversine_distance_m", "#[allow(dead_code)]\nfn haversine_distance_m")
content = content.replace("fn stop_has_coords", "#[allow(dead_code)]\nfn stop_has_coords")
content = content.replace("const GEO_TRANSFER_RADIUS_M", "#[allow(dead_code)]\nconst GEO_TRANSFER_RADIUS_M")

with open('rust-wasm/route-calculator/src/lib.rs', 'w') as f:
    f.write(content)
