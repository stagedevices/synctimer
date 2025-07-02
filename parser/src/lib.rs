use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use roxmltree::Document;

#[derive(Debug, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub bar: Option<u32>,
    pub beat: Option<f32>,
    pub time_ms: Option<u32>,
    pub instruments: Vec<String>,
}

pub fn parse_musicxml(xml: &str) -> anyhow::Result<Vec<Event>> {
    // Use roxmltree to easily traverse the MusicXML document
    let doc = Document::parse(xml)?;

    // Map part IDs (e.g. "P1") to their human-readable names (e.g. "Violin I")
    let mut part_names: HashMap<String, String> = HashMap::new();
    for score_part in doc.descendants().filter(|n| n.has_tag_name("score-part")) {
        if let Some(id) = score_part.attribute("id") {
            if let Some(name_node) = score_part
                .children()
                .find(|c| c.has_tag_name("part-name"))
            {
                if let Some(name) = name_node.text() {
                    part_names.insert(id.to_string(), name.to_string());
                }
            }
        }
    }

    let mut events = Vec::new();
    let mut counter = 0u32;

    // Iterate through all <part> sections and record one Event per <measure>
    for part in doc.descendants().filter(|n| n.has_tag_name("part")) {
        let part_id = part.attribute("id").unwrap_or("");
        let instrument = part_names
            .get(part_id)
            .cloned()
            .unwrap_or_else(|| "Unknown".to_string());

        for _measure in part.children().filter(|n| n.has_tag_name("measure")) {
            counter += 1;
            events.push(Event {
                id: format!("M{}", counter),
                bar: Some(counter),
                beat: Some(1.0),
                time_ms: None,
                instruments: vec![instrument.clone()],
            });
        }
    }

    Ok(events)
}

pub fn to_yaml(events: &[Event]) -> anyhow::Result<String> {
    Ok(serde_yaml::to_string(events)?)
}
