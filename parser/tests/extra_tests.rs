use parser::parse_musicxml;

#[test]
fn ignores_tempo_tags() {
    let xml = r#"<score-partwise version="3.1">
        <part id="P1"><measure number="1"/></part>
        <sound tempo="120"/>
    </score-partwise>"#;
    let ev = parse_musicxml(xml).unwrap();
    assert_eq!(ev.len(), 1);
}

#[test]
fn ignores_rehearsal_marks() {
    let xml = r#"<score-partwise version="3.1">
        <part id="P1"><measure number="1"/></part>
        <direction><direction-type><rehearsal>Intro</rehearsal></direction-type></direction>
    </score-partwise>"#;
    let ev = parse_musicxml(xml).unwrap();
    assert_eq!(ev.len(), 1);
}

#[test]
fn errors_on_malformed_xml() {
    let xml = "<score-partwise><part><measure></score-partwise>"; // unbalanced tags
    assert!(parse_musicxml(xml).is_err());
}
