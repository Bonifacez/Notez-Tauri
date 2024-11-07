use std::borrow::BorrowMut;

use command_group::{CommandGroup, Signal, UnixChildExt};
use log::{error, info};
use std::process::{Child, Command, Stdio};
use tauri::api::process::Command as TCommand;

pub struct SidecarLifeCycleService {
    program: String,
    sidecar_command: Command,
    child: Option<Child>,
}

impl SidecarLifeCycleService {
    pub fn new<S: Into<String>>(program: S) -> SidecarLifeCycleService {
        let program_string = program.into();
        let sidecar_command = TCommand::new_sidecar("main").expect("failed to setup sidecar");
        SidecarLifeCycleService {
            program: program_string,
            sidecar_command: sidecar_command.into(),
            child: None,
        }
    }

    pub fn start(&mut self) -> Result<String, String> {
        match self.child.borrow_mut() {
            Some(_) => {
                let info = format!("Sidecar {} already running", self.program);
                info!("{}", &info);
                Ok(info.into())
            }
            None => {
                let child = self.sidecar_command.stderr(Stdio::piped()).spawn();
                match child {
                    Ok(child) => {
                        let id = child.id();
                        self.child = Some(child);

                        let info = format!("Sidecar {} started - {}", self.program, id);
                        info!("{}", &info);

                        Ok(info.into())
                    }
                    Err(e) => {
                        let info =
                            format!("Sidecar {} start failed - {}", self.program, e.to_string());
                        error!("{}", &info);
                        Err(info.into())
                    }
                }
            }
        }
    }

    pub fn stop(&mut self) -> Result<String, String> {
        let mut child = self
            .sidecar_command
            .group_spawn()
            .expect("Failed to spawn backend sidecar");
        child.kill().expect("Failed to shutdown backend.");
        
        match self.child.borrow_mut() {
            Some(child) => {
                let id = child.id();

                child
                    .signal(Signal::SIGTERM)
                    .expect("Some error happened when killing child process");

                child.kill().expect("Failed to kill");

                match child.signal(Signal::SIGTERM) {
                    Ok(_) => {
                        info!("SIGTERM sent to sidecar {}", id);
                        std::thread::sleep(std::time::Duration::from_secs(2)); // 等待2秒
                        if child.try_wait().is_ok() {
                            info!("Sidecar {} stopped gracefully", id);
                        } else {
                            info!("Sidecar {} did not stop, sending SIGKILL", id);
                            child.signal(Signal::SIGKILL).expect("Failed to force kill");
                            child.kill().expect("Failed to kill");
                        }
                    }
                    Err(e) => error!("Failed to send SIGTERM: {}", e),
                }

                self.child = None;
                let info = format!("Sidecar {} stopped - {}", self.program, id);
                info!("{}", &info);
                Ok(info.into())
            }
            _ => {
                let info = format!("Sidecar {} stop failed", self.program);
                println!("{}", &info);
                Ok(info.into())
            }
        }
    }
}
