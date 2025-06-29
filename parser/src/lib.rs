use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub bar: Option<u32>,
    pub beat: Option<f32>,
    pub time_ms: Option<u32>,
    pub instruments: Vec<String>,
}

pub fn parse_musicxml(xml: &str) -> anyhow::Result<Vec<Event>> {
    use quick_xml::{events::Event as XEvent, Reader};
    let mut reader = Reader::from_str(xml);   // ← this line is Rust, not shell
    //reader.trim_text(true);                   // ← only one “m” in trim

    let mut buf = Vec::new();
    let mut events = Vec::new();
    let mut counter = 0;

    loop {
        match reader.read_event_into(&mut buf)? {
    // Catch both <measure>…</measure> and self-closing <measure …/>
    XEvent::Start(e) | XEvent::Empty(e) if e.name().as_ref() == b"measure" => {
        counter += 1;
        events.push(Event {
            id: format!("M{}", counter),
            bar: Some(counter),
            beat: Some(1.0),
            time_ms: None,
            instruments: vec!["Unknown".into()],
        });
    }
    XEvent::Eof => break,
    _ => {}
}

        buf.clear();
    }
    Ok(events)
}

pub fn to_yaml(events: &[Event]) -> anyhow::Result<String> {
    Ok(serde_yaml::to_string(events)?)
}
