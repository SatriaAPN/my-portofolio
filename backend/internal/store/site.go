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
	var skills, experience, hero, projectImg string
	err := s.db.QueryRow(`SELECT skills, experience, hero_image, project_image FROM site_content WHERE id = 1`).
		Scan(&skills, &experience, &hero, &projectImg)
	if err != nil {
		return models.SiteContent{}, err
	}
	headline, groups := parseSkills(skills)
	sc := models.SiteContent{
		Headline:     headline,
		SkillGroups:  groups,
		HeroImage:    hero,
		ProjectImage: projectImg,
	}
	if err := json.Unmarshal([]byte(experience), &sc.Experience); err != nil || sc.Experience == nil {
		sc.Experience = []models.ExperienceItem{}
	}
	for i := range sc.Experience {
		if sc.Experience[i].Highlights == nil {
			sc.Experience[i].Highlights = []string{}
		}
	}
	return sc, nil
}

func (s *Store) UpdateSite(sc models.SiteContent) (models.SiteContent, error) {
	stored := storedSkills{Headline: nonNil(sc.Headline), Groups: normGroups(sc.SkillGroups)}
	_, err := s.db.Exec(`UPDATE site_content SET skills=?, experience=?, hero_image=?, project_image=? WHERE id = 1`,
		mustJSON(stored), mustJSON(sc.Experience), sc.HeroImage, sc.ProjectImage)
	if err != nil {
		return sc, err
	}
	return s.GetSite()
}
