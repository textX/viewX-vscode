#!/usr/bin/env bash
#
############################
# Author:
# Daniel Kupčo
# 
# Introduction:
# A script for setting up the python virtual environment for viewX Visual Studio Code extension
# 
# Manual:
# Parameters needed for the script are -path (path for the environment to be created) and -name (name of the virtual environment).
# Optionaly you can define -reqFile (path to the requirements file).
# By default, it is assumed that script has been run from setup_scripts folder and the python_requirements.txt file from extension's root folder is been used.
#
# Note: Paths can be absolute or relative. ~ sign cannot be used, use /home/<user> instead!
#
# Example:
# ./viewX_setup.sh --path="some/parent/folder" --name="env_name" [--reqFile="path/to/requirements/file"]
############################
#
# flag arguments

if [ $# = 0 ]; then
	echo "No arguments have been defined!"
	echo "Please use -h or --help flags for additional information on how to use this script..."
	exit 1
fi

PARENT=""
NAME=""
REQ=""
ECHO=false

while test $# -gt 0; do
	case "$1" in
	    	-h|--help)
			echo "- Author: Daniel Kupčo"
			echo ""
			echo "- Introduction:"
			echo "	A script for setting up the python virtual environment for viewX Visual Studio Code extension"
			echo "- Manual:"
			echo "	Parameters needed for the script are --path (path for the environment to be created) and --name (name of the virtual environment)."
			echo "	Optionaly you can define --reqFile (path to the requirements file)."
			echo "	By default, it is assumed that script has been run from setup_scripts folder and the python_requirements.txt file from extension's root folder is been used."
			echo ""
			echo "- Note:"
			echo "	Paths can be absolute or relative. ~ sign cannot be used, use /home/<user> instead!"
			echo ""
			echo "- Example:"
			echo "	./viewX_setup.sh --path=\"some/parent/folder\" --name=\"env_name\" [--reqFile=\"path/to/requirements/file\"]"
					echo ""
	                echo "- Options:"
	                echo "	-h, --help                |  Show brief help."
        			echo "	-p, --path=PATH		  |  Specify a path to the environment's root folder."
	                echo "	-n, --name=NAME           |  Specify a name for the virtual environment."
	                echo "	-r, --reqFile=PATH        |  Specify a path to the requirements file. By default the 'python_requirements.txt' file is been used from extension's root folder."
	                echo "	-e, --echo                |  Echo every step to console."
	                exit 0
	                ;;
	        -p)
	                shift
	                if test $# -gt 0; then
	                        export PARENT=$1
	                else
	                        echo "no path specified"
	                        exit 1
	                fi
	                shift
	                ;;
	        --path*)
	                export PARENT=`echo $1 | sed -e 's/^[^=]*=//g'`
	                shift
	                ;;
	        -n)
	                shift
	                if test $# -gt 0; then
	                        export NAME=$1
	                else
	                        echo "no name specified"
	                        exit 1
	                fi
	                shift
	                ;;
	        --name*)
	                export NAME=`echo $1 | sed -e 's/^[^=]*=//g'`
	                shift
	                ;;
	        -r)
	                shift
	                if test $# -gt 0; then
	                        export REQ=$1
	                else
	                        echo "no requirement file specified"
	                        exit 1
	                fi
	                shift
	                ;;
	        --reqFile*)
	                export REQ=`echo $1 | sed -e 's/^[^=]*=//g'`
	                shift
	                ;;
	        -e|--echo)
					ECHO=true
					shift
	                ;;
	        *)
	                echo "ERROR: Unexpected option $1"
	                # break
	                exit 1
	                ;;
	esac
done

# setting requirements path
if [ -z "$REQ" ]; then
	REQ="./../python_requirements.txt"
fi

# fix PARENT path (remove trailing slash)
if [ "${PARENT: -1}" = "/" ]; then
	PARENT="${PARENT: : -1}"
fi

# fix NAME (remove trailing slash)
if [ "${NAME: -1}" = "/" ]; then
	NAME="${NAME: : -1}"
fi

VENVREQ="$PARENT/$NAME/python_requirements.txt"

if [ $ECHO = true ]; then
	echo "path > $PARENT"
	echo "name > $NAME"
	echo "reqFile > $REQ"
fi

if [ -d "$PARENT" ]; then
	VENV="$PARENT/$NAME"
	if [ -d "$VENV" ]; then
		echo " "
		echo " - A directory with path '$VENV' already exists!"
        	echo " - Please remove the directory or choose another name..."
		echo " "
	else
		echo " "
		echo " - Creating '$NAME' python virtual environment for viewX..."
		echo " "
		# create python virtual environment
		virtualenv --python=python3 $VENV
		# create the environment variable
		echo " "
		echo " - Adding 'viewXVEnv' environment variable..."
		echo " "
		export viewXVEnv=$VENV
		sudo echo "#" >> ~/.bashrc
		sudo echo "# Added by viewX VS Code extension" >> ~/.bashrc
		sudo echo "export viewXVEnv=$VENV" >> ~/.bashrc
		# copy requirements file to the virtual environment
		sudo cp $REQ $VENVREQ
		# this is the way to execute a script from specified path
		sudo "$VENV/bin/pip" install -r $VENVREQ
		echo " "
		echo " - Creating python symlink in the environment root folder..."
		# create symlink in root folder
		sudo ln -srf "$VENV/bin/python" "$VENV/python"
		echo " "
		echo " - Setup of viewX python virtual environment has been successfully finished!"
		echo " - You can now open the Visual Studio Code and start using the viewX extension!"
		echo " "
	fi
else
	echo " "
	echo " - Path '$PARENT' does not exist!"
	echo " "
fi
