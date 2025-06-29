use std::{fs, path::PathBuf};
use clap::Parser;

/// Simple MusicXML→YAML exporter
#[derive(Parser)]
#[command(author, version, about)]
struct Args {
    /// Path to a MusicXML file
    input: PathBuf,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    let xml = fs::read_to_string(&args.input)?;
    let events = parser::parse_musicxml(&xml)?;
    let yaml = parser::to_yaml(&events)?;
    println!("{yaml}");
    Ok(())
}
