import re

with open('rust-wasm/route-calculator/src/lib.rs', 'r') as f:
    content = f.read()

pass_2_code = """
            // Pass 2: Geographic proximity match
            if best_transfer.is_none() {
                'geo_search: for (idx_a, stop_a) in route_a.stops.iter().enumerate() {
                    if idx_a == origin_idx_a {
                        continue;
                    }

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

                        if (stop_a.lat - stop_b.lat).abs() > 0.004 ||
                           (stop_a.lng - stop_b.lng).abs() > 0.004 {
                            continue;
                        }

                        let dist = haversine_distance_m(stop_a.lat, stop_a.lng, stop_b.lat, stop_b.lng);
                        if dist <= GEO_TRANSFER_RADIUS_M {
                            let is_preferred = PREFERRED_HUBS.iter().any(|h| stop_a.name.contains(*h));
                            best_transfer = Some((idx_a, is_preferred, true));
                            break 'geo_search;
                        }
                    }
                }
            }
"""

content = content.replace(
    '''                        }
                    }
                }
            }

            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {''',
    f'''                        }}
                    }}
                }}
            }}{pass_2_code}
            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {{'''
)

with open('rust-wasm/route-calculator/src/lib.rs', 'w') as f:
    f.write(content)
