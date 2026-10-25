package com.example.testmarking.common.configuration;

import com.example.testmarking.template.calc.TemplateCalculationService;
import com.example.testmarking.template.render.TemplateSheetBuilder;
import com.example.testmarking.template.service.GridConfigNormalizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TemplateConfig {

    @Bean
    public TemplateCalculationService templateCalculationService() {
        return new TemplateCalculationService();
    }

    @Bean
    public GridConfigNormalizer gridConfigNormalizer() {
        return new GridConfigNormalizer();
    }

    @Bean
    public TemplateSheetBuilder templateSheetBuilder(TemplateCalculationService calc) {
        return new TemplateSheetBuilder(calc);
    }
}
