INSTALL_PATH = ~/.local/share/gnome-shell/extensions
INSTALL_NAME = steam-indicator@baer.space

install: build
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME)
	mkdir -p $(INSTALL_PATH)/$(INSTALL_NAME)
	cp -r --preserve=timestamps _build/* $(INSTALL_PATH)/$(INSTALL_NAME)
	rm -rf _build
	echo Installed in $(INSTALL_PATH)/$(INSTALL_NAME)

build: compile-schema
	rm -rf _build
	mkdir _build
	cp -r --preserve=timestamps icons locale schemas volumectrl *.js stylesheet.css metadata.json README.md _build
	echo Build was successful

compile-schema: ./schemas/org.gnome.shell.extensions.steam-indicator.gschema.xml
	glib-compile-schemas schemas

clean:
	rm -rf _build

uninstall:
	rm -rf $(INSTALL_PATH)/$(INSTALL_NAME	)
