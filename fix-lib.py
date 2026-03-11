import re

with open('rust-wasm/route-calculator/src/lib.rs', 'r') as f:
    content = f.read()

content = content.replace(
    'let mut best_transfer: Option<(usize, bool)> = None; // (idx_a, is_preferred)',
    'let mut best_transfer: Option<(usize, bool, bool)> = None; // (idx_a, is_preferred, geo)'
)

content = content.replace(
    '''                        match best_transfer {
                            None => {
                                best_transfer = Some((idx_a, is_preferred));
                            }
                            Some((_, current_is_preferred)) => {
                                if is_preferred && !current_is_preferred {
                                    best_transfer = Some((idx_a, is_preferred));
                                }
                            }
                        }''',
    '''                        match best_transfer {
                            None => {
                                best_transfer = Some((idx_a, is_preferred, false));
                            }
                            Some((_, current_is_preferred, _)) => {
                                if is_preferred && !current_is_preferred {
                                    best_transfer = Some((idx_a, is_preferred, false));
                                }
                            }
                        }'''
)

content = content.replace(
    '''            if let Some((idx_a, is_preferred)) = best_transfer {
                if let Some(stop) = route_a.stops.get(idx_a) {
                    candidates.push(TransferCandidate {
                        route_a,
                        route_b,
                        transfer_name: stop.name.as_str(),
                        price: route_a.price + route_b.price,
                        is_preferred,
                    });
                }
            }''',
    '''            if let Some((idx_a, is_preferred, geo_transfer)) = best_transfer {
                if let Some(stop) = route_a.stops.get(idx_a) {
                    candidates.push(TransferCandidate {
                        route_a,
                        route_b,
                        transfer_name: stop.name.as_str(),
                        price: route_a.price + route_b.price,
                        is_preferred,
                        geo_transfer,
                    });
                }
            }'''
)

with open('rust-wasm/route-calculator/src/lib.rs', 'w') as f:
    f.write(content)
