package org.game.szurmonej.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme.In;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "SzurMonej API",
                version = "v1",
                description = """
                        API aplikacji do zarządzania zbiórkami klasowymi.

                        **Autoryzacja:** najpierw wywołaj `POST /api/auth/login`, potem kolejne żądania
                        w tej samej sesji przeglądarki (ciasteczko sesji). W Swagger UI użyj endpointu login —
                        sesja zostanie zachowana automatycznie.
                        """,
                contact = @Contact(name = "SzurMonej")
        )
)
public class OpenApiConfig {

    private static final String SESSION_SCHEME = "sessionCookie";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes(SESSION_SCHEME, new io.swagger.v3.oas.models.security.SecurityScheme()
                                .type(Type.APIKEY)
                                .in(In.COOKIE)
                                .name("SESSION")
                                .description("Spring Session cookie (ustawiane po POST /api/auth/login)")))
                .addSecurityItem(new SecurityRequirement().addList(SESSION_SCHEME));
    }
}
