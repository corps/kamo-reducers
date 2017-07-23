{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

let
  npmInputs = import ./npm-env.nix {
    inherit pkgs system nodejs;
    packages = [
      "typescript" 
      { webpack = "2.6.1"; }
      { karma = "1.7.0"; }
      { qunitjs = "2.3.3"; }
      { "karma-chrome-launcher" = "2.2.0"; }
      { "karma-webpack" = "2.0.3"; }
      { "karma-qunit" = "1.2.1"; }
    ];
  };
in

with pkgs;
stdenv.mkDerivation {
  name = "kamo-reducers";
  buildInputs = npmInputs;
}
