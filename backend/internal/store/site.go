package store

import (
	"encoding/json"
	"strings"

	"portfolio-backend/internal/models"
)

// storedSkills is the on-disk shape of the site_content.skills column: a JSON
// object holding the headline strengths and the categorized groups.
type storedSkills struct {
	Headline []string            `json:"headline"`
	Groups   []models.SkillGroup `json:"groups"`
}

// parseSkills reads the skills column, tolerating the legacy flat-array form
// (["Go","React",...]) written before skills were categorized — those become a
// single ungrouped "Skills" bucket so nothing breaks on an un-migrated row.
func parseSkills(s string) (headline []string, groups []models.SkillGroup) {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "{") {
		var st storedSkills
		if err := json.Unmarshal([]byte(s), &st); err == nil {
			return nonNil(st.Headline), normGroups(st.Groups)
		}
		return []string{}, []models.SkillGroup{}
	}
	if flat := jsonArray(s); len(flat) > 0 {
		return []string{}, []models.SkillGroup{{Category: "Skills", Items: flat}}
	}
	return []string{}, []models.SkillGroup{}
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func normGroups(gs []models.SkillGroup) []models.SkillGroup {
	if gs == nil {
		return []models.SkillGroup{}
	}
	for i := range gs {
		gs[i].Items = nonNil(gs[i].Items)
	}
	return gs
}

func (s *Store) GetSite() (models.SiteContent, error) {
	var skills, experience, education, hero, projectImg, resumeName string
	err := s.db.QueryRow(`SELECT skills, experience, education, hero_image, project_image, resume_name FROM site_content WHERE id = 1`).
		Scan(&skills, &experience, &education, &hero, &projectImg, &resumeName)
	if err != nil {
		return models.SiteContent{}, err
	}
	headline, groups := parseSkills(skills)
	sc := models.SiteContent{
		Headline:     headline,
		SkillGroups:  groups,
		HeroImage:    hero,
		ProjectImage: projectImg,
		ResumeName:   resumeName,
		HasResume:    resumeName != "",
	}
	if err := json.Unmarshal([]byte(experience), &sc.Experience); err != nil || sc.Experience == nil {
		sc.Experience = []models.ExperienceItem{}
	}
	for i := range sc.Experience {
		if sc.Experience[i].Highlights == nil {
			sc.Experience[i].Highlights = []string{}
		}
	}
	if err := json.Unmarshal([]byte(education), &sc.Education); err != nil || sc.Education == nil {
		sc.Education = []models.EducationItem{}
	}
	return sc, nil
}

func (s *Store) UpdateSite(sc models.SiteContent) (models.SiteContent, error) {
	stored := storedSkills{Headline: nonNil(sc.Headline), Groups: normGroups(sc.SkillGroups)}
	_, err := s.db.Exec(`UPDATE site_content SET skills=?, experience=?, education=?, hero_image=?, project_image=? WHERE id = 1`,
		mustJSON(stored), mustJSON(sc.Experience), mustJSON(sc.Education), sc.HeroImage, sc.ProjectImage)
	if err != nil {
		return sc, err
	}
	return s.GetSite()
}

// GetResume returns the stored résumé as base64 (no data: prefix) and its
// original filename. Both are empty when nothing has been uploaded.
func (s *Store) GetResume() (pdfBase64, name string, err error) {
	err = s.db.QueryRow(`SELECT resume_pdf, resume_name FROM site_content WHERE id = 1`).
		Scan(&pdfBase64, &name)
	return pdfBase64, name, err
}

// SetResume stores (or replaces) the résumé PDF. pdfBase64 is the raw base64
// payload without the data: URL prefix.
func (s *Store) SetResume(pdfBase64, name, updated string) error {
	_, err := s.db.Exec(
		`UPDATE site_content SET resume_pdf=?, resume_name=?, resume_updated=? WHERE id = 1`,
		pdfBase64, name, updated,
	)
	return err
}

// ClearResume removes the stored résumé.
func (s *Store) ClearResume() error {
	_, err := s.db.Exec(
		`UPDATE site_content SET resume_pdf='', resume_name='', resume_updated='' WHERE id = 1`,
	)
	return err
}
