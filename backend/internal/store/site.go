package store

import (
	"encoding/json"

	"portfolio-backend/internal/models"
)

func (s *Store) GetSite() (models.SiteContent, error) {
	var skills, experience, hero, projectImg string
	err := s.db.QueryRow(`SELECT skills, experience, hero_image, project_image FROM site_content WHERE id = 1`).
		Scan(&skills, &experience, &hero, &projectImg)
	if err != nil {
		return models.SiteContent{}, err
	}
	sc := models.SiteContent{
		Skills:       jsonArray(skills),
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
	_, err := s.db.Exec(`UPDATE site_content SET skills=?, experience=?, hero_image=?, project_image=? WHERE id = 1`,
		mustJSON(sc.Skills), mustJSON(sc.Experience), sc.HeroImage, sc.ProjectImage)
	if err != nil {
		return sc, err
	}
	return s.GetSite()
}
