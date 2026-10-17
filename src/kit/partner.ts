/** "Rajesh Sawhney, Founder & General Partner": who she'll pitch at a fund, from its own team page. */
export const pitchLine = (face: { name: string; role: string } | null) => (face ? `${face.name}${face.role ? `, ${face.role}` : ""}` : null);
