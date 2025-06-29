use std::{convert::Infallible, env};
use bytes::Bytes;
use warp::Filter;

#[tokio::main]
async fn main() {
    // Read the PORT env var (default to 8080)
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8080);

    // POST /parse with raw XML in body
    let parse_route = warp::post()
        .and(warp::path("parse"))
        .and(warp::body::bytes())
        .and_then(handle_parse);

    println!("Server listening on 0.0.0.0:{}", port);
    warp::serve(parse_route)
        .run(([0, 0, 0, 0], port))
        .await;
}

async fn handle_parse(body: Bytes) -> Result<impl warp::Reply, Infallible> {
    let xml = std::str::from_utf8(&body).unwrap_or("");
    let result = match parser::parse_musicxml(xml) {
        Ok(events) => match parser::to_yaml(&events) {
            Ok(yaml) => warp::reply::with_status(yaml, warp::http::StatusCode::OK),
            Err(e) => warp::reply::with_status(e.to_string(), warp::http::StatusCode::INTERNAL_SERVER_ERROR),
        },
        Err(e) => warp::reply::with_status(e.to_string(), warp::http::StatusCode::BAD_REQUEST),
    };
    Ok(result)
}
