use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Hash)]
struct Stop {
    id: String,
    name: String,
    lat: u64,
    lng: u64,
    order: u32,
}

fn main() {
    let mut hasher = DefaultHasher::new();
    let s = Stop {
        id: "1".to_string(),
        name: "test".to_string(),
        lat: 1,
        lng: 2,
        order: 3,
    };
    s.hash(&mut hasher);
    println!("hash: {}", hasher.finish());
}
