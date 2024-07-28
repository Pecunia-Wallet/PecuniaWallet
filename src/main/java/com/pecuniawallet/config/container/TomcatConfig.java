package com.pecuniawallet.config.container;

import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.Context;
import org.apache.catalina.connector.Connector;
import org.apache.tomcat.util.descriptor.web.SecurityCollection;
import org.apache.tomcat.util.descriptor.web.SecurityConstraint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
public class TomcatConfig {

    @Value("${app.ssl}") Boolean requiresSecure;

    @Bean
    public ServletWebServerFactory servletContainer() {
        try {
            Runtime.getRuntime()
                    .exec(new String[]{"/bin/bash", "-c", "fuser 443/tcp -k"})
                    .waitFor(2, TimeUnit.MINUTES);
            Runtime.getRuntime()
                    .exec(new String[]{"/bin/bash", "-c", "fuser 80/tcp -k"})
                    .waitFor(2, TimeUnit.MINUTES);
        } catch (IOException | InterruptedException e) {
            log.warn("Failed to free up a port", e);
        }

        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory() {
            @Override
            protected void postProcessContext(Context context) {
                if (requiresSecure) {
                    SecurityConstraint securityConstraint = new SecurityConstraint();
                    securityConstraint.setUserConstraint("CONFIDENTIAL");
                    SecurityCollection collection = new SecurityCollection();
                    collection.addPattern("/*");
                    securityConstraint.addCollection(collection);
                    context.addConstraint(securityConstraint);
                }
            }
        };
        if (requiresSecure) tomcat.addAdditionalTomcatConnectors(redirectConnector());
        tomcat.setPort(requiresSecure ? 443 : 80);
        return tomcat;
    }

    private Connector redirectConnector() {
        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setScheme("http");
        connector.setPort(80);
        connector.setSecure(false);
        connector.setRedirectPort(443);
        return connector;
    }

}
